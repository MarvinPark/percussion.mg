"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchProductsForSaleDropdown } from "@/app/(main)/products/actions";
import ProductSearchResultRow from "@/components/product-search-result-row";
import type { SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs leading-none text-zinc-900 placeholder:text-xs placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 max-md:text-base max-md:placeholder:text-base dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const compactInputClass =
  "h-[26px] w-44 rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-none text-zinc-900 placeholder:text-xs placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 max-md:h-10 max-md:text-base max-md:placeholder:text-base dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:w-52";

const compactConfirmButtonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const MAX_RESULTS = 40;

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type ProductListSearchProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onConfirm: () => void;
  onSelectProduct: (product: SaleProductOption) => void;
  compact?: boolean;
};

export default function ProductListSearch({
  query,
  onQueryChange,
  onConfirm,
  onSelectProduct,
  compact = false,
}: ProductListSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);
  const [results, setResults] = useState<SaleProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const trimmedQuery = query.trim();
  const showDropdown = isOpen && trimmedQuery.length > 0;

  function handleSelect(product: SaleProductOption) {
    onSelectProduct(product);
    setIsOpen(false);
  }

  function handleSelectHighlighted() {
    const product = results[highlightIndex];
    if (!product) return;
    handleSelect(product);
  }

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

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void searchProductsForSaleDropdown(trimmed).then((response) => {
        setResults((response.products as SaleProductOption[]).slice(0, MAX_RESULTS));
        setIsSearching(false);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

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

  useEffect(() => {
    setHighlightIndex(0);
  }, [results, trimmedQuery]);

  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || results.length === 0) return;

    const option = dropdownRef.current.querySelector<HTMLElement>(
      `[data-result-index="${highlightIndex}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, showDropdown, results.length]);

  function handleConfirm() {
    onConfirm();
    setIsOpen(false);
  }

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
          results.map((product, index) => (
            <ProductSearchResultRow
              key={product.id}
              product={product}
              emphasizeModelName
              highlighted={index === highlightIndex}
              onHighlight={() => setHighlightIndex(index)}
              resultIndex={index}
              onSelect={() => handleSelect(product)}
            />
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className={`relative shrink-0 ${compact ? "flex items-center gap-1" : ""}`}>
      <label htmlFor="product_list_search" className="sr-only">
        제품 검색
      </label>
      <input
        ref={inputRef}
        id="product_list_search"
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        placeholder={
          compact ? "제품 검색..." : "공급처, 품목, 브랜드, 제품명, 모델명, SKU, 태그 검색..."
        }
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          onQueryChange(value);
          const hasQuery = value.trim().length > 0;
          setIsOpen(hasQuery);
          if (hasQuery) {
            updateDropdownPosition();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            if (!showDropdown) {
              if (trimmedQuery) {
                setIsOpen(true);
                updateDropdownPosition();
              }
              return;
            }
            event.preventDefault();
            if (results.length > 0) {
              setHighlightIndex((prev) => (prev + 1) % results.length);
            }
            return;
          }

          if (event.key === "ArrowUp") {
            if (!showDropdown) return;
            event.preventDefault();
            if (results.length > 0) {
              setHighlightIndex(
                (prev) => (prev - 1 + results.length) % results.length,
              );
            }
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (showDropdown && !isSearching && results.length > 0) {
              handleSelectHighlighted();
              return;
            }
            handleConfirm();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        className={compact ? compactInputClass : inputClass}
        autoComplete="off"
      />
      {compact ? (
        <>
          <button
            type="button"
            onClick={handleConfirm}
            className={compactConfirmButtonClass}
          >
            확인
          </button>
        </>
      ) : null}
      {!compact && query.trim() ? (
        <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          {isSearching
            ? "검색 중..."
            : `목록 ${results.length}건 표시${results.length >= MAX_RESULTS ? ` (최대 ${MAX_RESULTS}건)` : ""}`}
        </p>
      ) : null}

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
