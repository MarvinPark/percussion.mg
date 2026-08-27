"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  applyKeyStockToProducts,
  deleteProductsByIds,
  duplicateProducts,
} from "@/app/(main)/products/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import ExcelProductActions from "@/components/excel-product-actions";
import ProductsBulkEditModal from "@/components/products-bulk-edit-modal";
import ProductsList from "@/components/products-list";
import type { ProductReservationsByProductId } from "@/lib/product-reservations";
import type { ProductListSort, ProductSortColumn } from "@/lib/product-list-sort";
import type { Product } from "@/types/product";

const toolbarButtonClass =
  "inline-flex items-center rounded border border-zinc-300 px-2 py-1 text-[12px] leading-none font-normal text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

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
  reservationsByProductId?: ProductReservationsByProductId;
  readOnly?: boolean;
  externalHighlightedIds?: Set<string>;
  searchSlot?: ReactNode;
  listSummary?: ReactNode;
  searchQuery?: string;
  sort: ProductListSort;
  onSortColumn: (column: ProductSortColumn) => void;
  emptyMessage?: string;
};

export default function ProductsWorkspace({
  userId,
  products,
  reservationsByProductId = {},
  readOnly = false,
  externalHighlightedIds,
  searchSlot,
  listSummary,
  searchQuery = "",
  sort,
  onSortColumn,
  emptyMessage,
}: ProductsWorkspaceProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product[] | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [isApplyingKeyStock, setIsApplyingKeyStock] = useState(false);
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

  const handleDuplicate = useCallback(
    async (targets: Product[]) => {
      if (!targets.length || isDuplicating) return;

      setIsDuplicating(true);
      try {
        const result = await duplicateProducts(targets.map((product) => product.id));

        if (result.error) {
          showToast(result.error);
          return;
        }

        if (result.ids?.length) {
          pendingHighlightRef.current = result.ids;
          setSelectedIds(new Set());
          showToast(`복제 ${result.ids.length}건`);
          router.refresh();
        }
      } finally {
        setIsDuplicating(false);
      }
    },
    [isDuplicating, router, showToast],
  );

  const handleDuplicateSelected = useCallback(() => {
    const selected = products.filter((product) => selectedIds.has(product.id));
    if (!selected.length) return;
    void handleDuplicate(selected);
  }, [handleDuplicate, products, selectedIds]);

  const handleDeleteProducts = useCallback(
    async (targets: Product[]) => {
      if (!targets.length) return;

      const ids = targets.map((product) => product.id);
      const result = await deleteProductsByIds(ids);

      if (result.error) {
        showToast(result.error);
        return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const product of targets) {
          next.delete(product.id);
        }
        return next;
      });
      showToast(`삭제 ${targets.length}건`);
      router.refresh();
    },
    [router, showToast],
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

  const handleDeleteSelected = useCallback(() => {
    const selected = products.filter((product) => selectedIds.has(product.id));
    if (!selected.length) return;
    handleRequestDelete(selected);
  }, [handleRequestDelete, products, selectedIds]);

  useEffect(() => {
    if (!pendingHighlightRef.current.length) return;

    const ids = pendingHighlightRef.current;
    pendingHighlightRef.current = [];
    applyHighlight(ids);
  }, [products, applyHighlight]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const mergedHighlightedIds = useMemo(() => {
    const merged = new Set(highlightedIds);
    externalHighlightedIds?.forEach((id) => merged.add(id));
    return merged;
  }, [highlightedIds, externalHighlightedIds]);

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(products.map((product) => product.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleBulkEditSaved() {
    setSelectedIds(new Set());
    showToast("일괄 수정 완료");
    router.refresh();
  }

  const handleApplyKeyStock = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || isApplyingKeyStock) return;

    setIsApplyingKeyStock(true);
    try {
      const result = await applyKeyStockToProducts(ids);
      if (result.error) {
        showToast(result.error);
        return;
      }

      setSelectedIds(new Set());
      showToast(`주요 재고 ${result.updatedCount ?? ids.length}건 적용`);
      router.refresh();
    } finally {
      setIsApplyingKeyStock(false);
    }
  }, [isApplyingKeyStock, router, selectedIds, showToast]);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {searchSlot || listSummary || !readOnly ? (
          <div className="flex flex-wrap items-center gap-3">
            {searchSlot ? <div className="shrink-0">{searchSlot}</div> : null}
            {!readOnly ? (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  disabled={selectedIds.size === 0 || isDuplicating}
                  className={toolbarButtonClass}
                >
                  {isDuplicating ? "복제 중..." : "복제"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className={toolbarButtonClass}
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setBulkEditOpen(true)}
                  disabled={selectedIds.size === 0}
                  className={toolbarButtonClass}
                >
                  일괄수정
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyKeyStock()}
                  disabled={selectedIds.size === 0 || isApplyingKeyStock}
                  className={toolbarButtonClass}
                >
                  {isApplyingKeyStock ? "적용 중..." : "주요재고 적용"}
                </button>
              </div>
            ) : null}
            {listSummary ? (
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {listSummary}
              </p>
            ) : null}
          </div>
        ) : null}
        {!readOnly ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 max-md:ml-0 max-md:w-full">
            <ExcelProductActions searchQuery={searchQuery} sort={sort} />
          </div>
        ) : null}
      </div>

      {toast ? <ActionToast message={toast} /> : null}

      {pendingDelete ? (
        <DeleteConfirmDialog
          count={pendingDelete.length}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      {bulkEditOpen ? (
        <ProductsBulkEditModal
          productIds={Array.from(selectedIds)}
          onClose={() => setBulkEditOpen(false)}
          onSaved={handleBulkEditSaved}
        />
      ) : null}

      <ProductsList
        userId={userId}
        products={products}
        reservationsByProductId={reservationsByProductId}
        readOnly={readOnly}
        sort={sort}
        onSortColumn={onSortColumn}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        highlightedIds={mergedHighlightedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={handleSelectAll}
        onDuplicateProducts={handleDuplicate}
        onRequestDelete={handleRequestDelete}
        isDuplicating={isDuplicating}
        emptyMessage={emptyMessage}
      />
    </>
  );
}
