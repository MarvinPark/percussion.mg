"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const compactInputClass =
  "w-full min-w-[11rem] rounded border border-zinc-400 bg-white px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const MAX_RESULTS = 50;

function productLabel(product: SaleProductOption) {
  return `${product.product_name} / ${product.model_name} (${product.supplier}) — 재고 ${product.stock_quantity}개`;
}

function matchesQuery(product: SaleProductOption, query: string) {
  const haystack = [
    product.product_name,
    product.model_name,
    product.supplier,
    product.sku ?? "",
    product.keywords ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type ProductSearchSelectProps = {
  products: SaleProductOption[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  initialDisplayValue?: string;
  compact?: boolean;
  showHiddenField?: boolean;
  showHelperText?: boolean;
  inputId?: string;
};

export default function ProductSearchSelect({
  products,
  selectedProductId,
  onSelect,
  initialDisplayValue,
  compact = false,
  showHiddenField = true,
  showHelperText = true,
  inputId = "product_search",
}: ProductSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState(initialDisplayValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(
    null,
  );

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return products.slice(0, MAX_RESULTS);
    }

    return products
      .filter((product) => matchesQuery(product, normalized))
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  function updateDropdownPosition() {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, compact ? 280 : rect.width),
    });
  }

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
    onSelect(product.id);
    setQuery(productLabel(product));
    setIsOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setIsOpen(true);

    if (selectedProduct && value !== productLabel(selectedProduct)) {
      onSelect("");
    }
  }

  const dropdown = isOpen && dropdownPosition ? (
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
      className="max-h-60 overflow-y-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
    >
      {filteredProducts.length === 0 ? (
        <li className="px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
          검색 결과가 없습니다.
        </li>
      ) : (
        filteredProducts.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              role="option"
              aria-selected={product.id === selectedProductId}
              onClick={() => handleSelect(product)}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {product.product_name}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {product.model_name}
                {product.sku ? ` · ${product.sku}` : ""} · {product.supplier} · 재고{" "}
                {product.stock_quantity}개
                {product.keywords ? (
                  <span className="block text-zinc-500 dark:text-zinc-500">
                    #{product.keywords.replace(/,/g, " #")}
                  </span>
                ) : null}
              </p>
            </button>
          </li>
        ))
      )}
      {products.length > MAX_RESULTS &&
      query.trim() === "" &&
      filteredProducts.length === MAX_RESULTS ? (
        <li className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          검색어를 입력하면 더 빠르게 찾을 수 있습니다. (최대 {MAX_RESULTS}건 표시)
        </li>
      ) : null}
    </ul>
  ) : null;

  return (
    <div ref={containerRef} className="relative min-w-[10rem]">
      {showHiddenField ? (
        <input type="hidden" name="product_id" value={selectedProductId} required />
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        placeholder={
          compact ? "제품 검색..." : "제품명, 모델명, SKU, 키워드, 공급처로 검색..."
        }
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          setIsOpen(true);
          updateDropdownPosition();
        }}
        className={compact ? compactInputClass : inputClass}
        autoComplete="off"
      />

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}

      {showHelperText ? (
        selectedProduct ? (
          <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
            선택됨: {productLabel(selectedProduct)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            클릭 후 이름을 입력하면 해당 제품만 목록에 표시됩니다.
          </p>
        )
      ) : null}
    </div>
  );
}
