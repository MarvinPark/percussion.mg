"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  searchSaleProductsForOrderLink,
  type SmartstoreOrderLinkHint,
} from "@/lib/product-search";
import type { SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

type SmartstoreProductComboboxProps = {
  products: SaleProductOption[];
  selectedProductId: string;
  autoMatchedProductId?: string | null;
  autoCreateEnabled: boolean;
  orderHint?: SmartstoreOrderLinkHint;
  disabled?: boolean;
  onSelect: (productId: string) => void;
  onClear: () => void;
};

function productLabel(product: SaleProductOption) {
  return [product.product_name, product.sku, product.model_name]
    .filter(Boolean)
    .join(" · ");
}

type DropdownEntry =
  | { kind: "match"; product: SaleProductOption }
  | { kind: "similar"; product: SaleProductOption };

export default function SmartstoreProductCombobox({
  products,
  selectedProductId,
  autoMatchedProductId,
  autoCreateEnabled,
  orderHint,
  disabled = false,
  onSelect,
  onClear,
}: SmartstoreProductComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const autoMatchedProduct = useMemo(
    () =>
      products.find((product) => product.id === autoMatchedProductId) ?? null,
    [products, autoMatchedProductId],
  );

  const displayValue =
    isEditing || query
      ? query
      : selectedProduct
        ? productLabel(selectedProduct)
        : autoMatchedProduct
          ? productLabel(autoMatchedProduct)
          : "";

  const searchQuery = isEditing || query ? query : "";

  const { matches, similar } = useMemo(
    () => searchSaleProductsForOrderLink(products, searchQuery, orderHint),
    [products, searchQuery, orderHint],
  );

  const dropdownEntries = useMemo<DropdownEntry[]>(() => {
    const entries: DropdownEntry[] = matches.map((product) => ({
      kind: "match",
      product,
    }));

    if (similar.length > 0) {
      for (const product of similar) {
        entries.push({ kind: "similar", product });
      }
    }

    return entries;
  }, [matches, similar]);

  const showDropdown =
    open && !disabled && searchQuery.trim().length > 0 && dropdownEntries.length > 0;
  const showEmptyState =
    open && !disabled && searchQuery.trim().length > 0 && dropdownEntries.length === 0;

  useEffect(() => {
    setHighlightIndex(0);
  }, [dropdownEntries.length, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
        setIsEditing(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(product: SaleProductOption) {
    onSelect(product.id);
    setQuery("");
    setIsEditing(false);
    setOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setIsEditing(true);
    setOpen(value.trim().length > 0);

    if (!value.trim()) {
      onClear();
    }
  }

  function handleClearClick() {
    setQuery("");
    setIsEditing(false);
    setOpen(false);
    onClear();
    inputRef.current?.focus();
  }

  function renderProductRow(
    entry: DropdownEntry,
    index: number,
    showSimilarLabel: boolean,
  ) {
    const { product } = entry;
    return (
      <li key={`${entry.kind}-${product.id}`}>
        {showSimilarLabel && index === matches.length ? (
          <div className="border-t border-zinc-200 px-3 py-1.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            주문과 유사
          </div>
        ) : null}
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleSelect(product)}
          className={`grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-2 px-3 py-2 text-left text-xs ${
            index === highlightIndex
              ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
              : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          <span className="truncate">{product.product_name}</span>
          <span className="truncate text-zinc-500 dark:text-zinc-400">
            {product.sku || "—"}
          </span>
          <span className="truncate text-zinc-500 dark:text-zinc-400">
            {product.model_name || "—"}
          </span>
        </button>
      </li>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-[260px]">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          disabled={disabled}
          placeholder={
            autoCreateEnabled
              ? "제품명·SKU 검색 또는 자동 등록"
              : "제품명·SKU·모델명 검색"
          }
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setIsEditing(true);
            if (displayValue) {
              window.requestAnimationFrame(() => {
                inputRef.current?.select();
              });
            }
          }}
          onKeyDown={(event) => {
            if (!open || dropdownEntries.length === 0) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightIndex((prev) => (prev + 1) % dropdownEntries.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightIndex(
                (prev) =>
                  (prev - 1 + dropdownEntries.length) % dropdownEntries.length,
              );
            } else if (
              event.key === "Enter" &&
              dropdownEntries[highlightIndex]
            ) {
              event.preventDefault();
              handleSelect(dropdownEntries[highlightIndex].product);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
              setIsEditing(false);
            }
          }}
          className={inputClass}
          autoComplete="off"
        />
        {displayValue ? (
          <button
            type="button"
            disabled={disabled}
            onClick={handleClearClick}
            className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            지움
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span>제품명</span>
            <span>SKU</span>
            <span>모델명</span>
          </div>
          <ul className="max-h-56 overflow-auto">
            {dropdownEntries.map((entry, index) =>
              renderProductRow(entry, index, similar.length > 0),
            )}
          </ul>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-500 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          검색 결과가 없습니다.
        </div>
      ) : null}
    </div>
  );
}
