"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProductsByIds,
  pasteProducts,
  restoreProducts,
} from "@/app/products/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import ExcelProductActions from "@/components/excel-product-actions";
import ProductsList from "@/components/products-list";
import type { CopiedProduct, Product } from "@/types/product";

const toolbarButtonClass =
  "inline-flex items-center rounded border border-zinc-300 px-2 py-1 text-[12px] leading-none font-normal text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

type PasteHistoryEntry = {
  type: "paste";
  productIds: string[];
  items: CopiedProduct[];
};

type DeleteHistoryEntry = {
  type: "delete";
  products: Product[];
};

type HistoryEntry = PasteHistoryEntry | DeleteHistoryEntry;

function productToCopied(product: Product): CopiedProduct {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = product;
  return {
    ...rest,
    purchase_price: Number(rest.purchase_price) || 0,
    sale_price: Number(rest.sale_price) || 0,
    stock_quantity: Number(rest.stock_quantity) || 0,
    min_stock_quantity: Number(rest.min_stock_quantity) || 0,
    is_key_stock: rest.is_key_stock ?? false,
    stock_location: rest.stock_location ?? "3층",
    stock_floor3: Number(rest.stock_floor3) || 0,
    stock_b1: Number(rest.stock_b1) || 0,
    stock_display: Number(rest.stock_display) || 0,
    reserved_quantity: Number(rest.reserved_quantity) || 0,
  };
}

function shouldIgnoreKeyboardShortcut(event: KeyboardEvent) {
  const element =
    (event.target instanceof HTMLElement ? event.target : null) ??
    (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);

  if (!element) return false;

  if (element instanceof HTMLInputElement) {
    return element.type !== "checkbox";
  }

  const tag = element.tagName;
  return (
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}

function ActionToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-normal text-white shadow-lg dark:bg-zinc-700"
    >
      {message}
    </div>
  );
}

type ProductsWorkspaceProps = {
  userId: string;
  products: Product[];
};

export default function ProductsWorkspace({
  userId,
  products,
}: ProductsWorkspaceProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [clipboard, setClipboard] = useState<CopiedProduct[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product[] | null>(null);
  const clipboardRef = useRef<CopiedProduct[]>([]);
  const pastingRef = useRef(false);
  const historyBusyRef = useRef(false);
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const pendingHighlightRef = useRef<string[]>([]);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 1500);
  }, []);

  const applyHighlight = useCallback((ids: string[]) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedIds(new Set(ids));
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedIds(new Set());
    }, 2000);
  }, []);

  const pushHistory = useCallback((entry: HistoryEntry) => {
    undoStackRef.current.push(entry);
    redoStackRef.current = [];
  }, []);

  const copyProducts = useCallback(
    (items: Product[]) => {
      if (!items.length) return;

      const copied = items.map(productToCopied);
      clipboardRef.current = copied;
      setClipboard(copied);
      showToast("복사");
    },
    [showToast],
  );

  const handleCopy = useCallback(() => {
    const selected = products.filter((product) => selectedIds.has(product.id));
    if (!selected.length) return;
    copyProducts(selected);
  }, [copyProducts, products, selectedIds]);

  const handlePaste = useCallback(async () => {
    const items = clipboardRef.current;
    if (!items.length || pastingRef.current) return;

    pastingRef.current = true;
    setIsPasting(true);

    try {
      const result = await pasteProducts(items);

      if (result.error) {
        showToast(result.error);
        return;
      }

      if (result.ids?.length) {
        pushHistory({
          type: "paste",
          productIds: result.ids,
          items: items.map((item) => ({ ...item })),
        });
        pendingHighlightRef.current = result.ids;
        setSelectedIds(new Set());
        showToast("붙여넣기");
        router.refresh();
      }
    } finally {
      pastingRef.current = false;
      setIsPasting(false);
    }
  }, [pushHistory, router, showToast]);

  const handleDeleteProducts = useCallback(
    async (targets: Product[]) => {
      if (!targets.length || historyBusyRef.current) return;

      historyBusyRef.current = true;

      try {
        const ids = targets.map((product) => product.id);
        const result = await deleteProductsByIds(ids);

        if (result.error) {
          showToast(result.error);
          return;
        }

        pushHistory({ type: "delete", products: targets });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const product of targets) {
            next.delete(product.id);
          }
          return next;
        });
        router.refresh();
      } finally {
        historyBusyRef.current = false;
      }
    },
    [pushHistory, router, showToast],
  );

  const handleRequestDelete = useCallback((targets: Product[]) => {
    if (!targets.length) return;
    setPendingDelete(targets);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete?.length) return;

    const targets = pendingDelete;
    setPendingDelete(null);
    void handleDeleteProducts(targets);
  }, [handleDeleteProducts, pendingDelete]);

  const handleUndo = useCallback(async () => {
    if (historyBusyRef.current || !undoStackRef.current.length) return;

    const entry = undoStackRef.current.pop();
    if (!entry) return;

    historyBusyRef.current = true;

    try {
      if (entry.type === "paste") {
        const result = await deleteProductsByIds(entry.productIds);
        if (result.error) {
          undoStackRef.current.push(entry);
          showToast(result.error);
          return;
        }
      } else {
        const result = await restoreProducts(entry.products);
        if (result.error) {
          undoStackRef.current.push(entry);
          showToast(result.error);
          return;
        }
      }

      redoStackRef.current.push(entry);
      setSelectedIds(new Set());
      showToast("실행 취소");
      router.refresh();
    } finally {
      historyBusyRef.current = false;
    }
  }, [router, showToast]);

  const handleRedo = useCallback(async () => {
    if (historyBusyRef.current || !redoStackRef.current.length) return;

    const entry = redoStackRef.current.pop();
    if (!entry) return;

    historyBusyRef.current = true;

    try {
      if (entry.type === "paste") {
        const result = await pasteProducts(entry.items);
        if (result.error || !result.ids?.length) {
          redoStackRef.current.push(entry);
          showToast(result.error ?? "다시 실행에 실패했습니다.");
          return;
        }

        entry.productIds = result.ids;
        pendingHighlightRef.current = result.ids;
      } else {
        const result = await deleteProductsByIds(
          entry.products.map((product) => product.id),
        );
        if (result.error) {
          redoStackRef.current.push(entry);
          showToast(result.error);
          return;
        }
      }

      undoStackRef.current.push(entry);
      setSelectedIds(new Set());
      showToast("다시 실행");
      router.refresh();
    } finally {
      historyBusyRef.current = false;
    }
  }, [router, showToast]);

  useEffect(() => {
    if (!pendingHighlightRef.current.length) return;

    const ids = pendingHighlightRef.current;
    pendingHighlightRef.current = [];
    applyHighlight(ids);
  }, [products, applyHighlight]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardShortcut(event)) return;

      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      if (event.key === "z" || event.key === "Z") {
        event.preventDefault();
        if (event.shiftKey) {
          void handleRedo();
        } else {
          void handleUndo();
        }
        return;
      }

      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        void handleRedo();
        return;
      }

      if (event.key === "c" || event.key === "C") {
        const selected = products.filter((product) =>
          selectedIds.has(product.id),
        );
        if (!selected.length) return;

        event.preventDefault();
        const copied = selected.map(productToCopied);
        clipboardRef.current = copied;
        setClipboard(copied);
        showToast("복사");
      }

      if (event.key === "v" || event.key === "V") {
        if (!clipboardRef.current.length || pastingRef.current) return;

        event.preventDefault();
        void handlePaste();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    handlePaste,
    handleRedo,
    handleUndo,
    products,
    selectedIds,
    showToast,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(products.map((product) => product.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-start justify-end gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={selectedIds.size === 0}
            className={toolbarButtonClass}
          >
            복사
          </button>
          <button
            type="button"
            onClick={() => void handlePaste()}
            disabled={isPasting || clipboard.length === 0}
            className={toolbarButtonClass}
          >
            {isPasting ? "붙여넣는 중..." : "붙여넣기"}
          </button>
        </div>
        <ExcelProductActions />
      </div>

      {toast ? <ActionToast message={toast} /> : null}

      {pendingDelete ? (
        <DeleteConfirmDialog
          count={pendingDelete.length}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      <ProductsList
        userId={userId}
        products={products}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        highlightedIds={highlightedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={handleSelectAll}
        onCopyProducts={copyProducts}
        onPaste={() => void handlePaste()}
        onRequestDelete={handleRequestDelete}
        hasClipboard={clipboard.length > 0}
        isPasting={isPasting}
      />
    </>
  );
}
