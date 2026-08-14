"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchProductsForSaleDropdown } from "@/app/(main)/products/actions";
import ProductSearchResultRow from "@/components/product-search-result-row";
import type { SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const compactInputClass =
  "w-full min-w-[11rem] rounded border border-zinc-400 bg-white px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const MAX_RESULTS = 40;

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

function productLabel(product: SaleProductOption) {
  return `${product.product_name} / ${product.model_name}`;
}

type ProductSearchSelectProps = {
  selectedProduct?: SaleProductOption | null;
  onSelect: (product: SaleProductOption | null) => void;
  compact?: boolean;
  showHiddenField?: boolean;
  showHelperText?: boolean;
  inputId?: string;
};

export default function ProductSearchSelect({
  selectedProduct = null,
  onSelect,
  compact = false,
  showHiddenField = true,
  showHelperText = true,
  inputId = "product_search",
}: ProductSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState(() =>
    selectedProduct ? productLabel(selectedProduct) : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);
  const [results, setResults] = useState<SaleProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setQuery(selectedProduct ? productLabel(selectedProduct) : "");
  }, [selectedProduct]);

  function updateDropdownPosition() {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, compact ? 360 : rect.width),
    });
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (selectedProduct && trimmed === productLabel(selectedProduct)) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void searchProductsForSaleDropdown(trimmed).then((response) => {
        setResults((response.products as SaleProductOption[]).slice(0, MAX_RESULTS));
        setIsSearching(false);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, selectedProduct]);

  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleReposition() {
      updateDropdownPosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, compact]);

  function handleSelect(product: SaleProductOption) {
    onSelect(product);
    setQuery(productLabel(product));
    setIsOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);

    const hasQuery = value.trim().length > 0;
    setIsOpen(hasQuery);
    if (hasQuery) {
      updateDropdownPosition();
    }

    if (selectedProduct && value !== productLabel(selectedProduct)) {
      onSelect(null);
    }
  }

  const showDropdown =
    isOpen &&
    query.trim().length > 0 &&
    (!selectedProduct || query.trim() !== productLabel(selectedProduct));

  const dropdown =
    showDropdown && dropdownPosition ? (
      <ul
        ref={dropdownRef}
        role="listbox"
        style={{
          position: "fixed",
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 9999,
        }}
        className="max-h-72 overflow-y-auto rounded-xl border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
      >
        {isSearching ? (
          <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            검색 중...
          </li>
        ) : results.length === 0 ? (
          <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            검색 결과가 없습니다.
          </li>
        ) : (
          results.map((product) => (
            <ProductSearchResultRow
              key={product.id}
              product={product}
              onSelect={() => handleSelect(product)}
            />
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className="relative min-w-[10rem]">
      {showHiddenField ? (
        <input
          type="hidden"
          name="product_id"
          value={selectedProduct?.id ?? ""}
          required
        />
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={Boolean(showDropdown)}
        aria-autocomplete="list"
        placeholder={
          compact
            ? "제품 검색..."
            : "공급처, 품목, 브랜드, 제품명, 모델명, SKU, 태그 검색..."
        }
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
        className={compact ? compactInputClass : inputClass}
        style={compact ? { fontSize: 12 } : undefined}
        autoComplete="off"
      />

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}

      {showHelperText ? (
        selectedProduct ? (
          <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
            선택됨: {selectedProduct.product_name} / {selectedProduct.model_name}{" "}
            · 재고 {selectedProduct.stock_quantity}개
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            SKU, 품목, 모델명, 제품명 등으로 검색해 선택하세요.
          </p>
        )
      ) : null}
    </div>
  );
}
