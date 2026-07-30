"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { filterSalesByTextQuery } from "@/lib/sales-search";
import type { SaleWithProduct } from "@/types/sale";

const inputClass =
  "h-[26px] w-44 rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-none text-zinc-900 placeholder:text-xs placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:w-52";

const MAX_RESULTS = 40;

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type SalesListSearchProps = {
  sales: SaleWithProduct[];
  query: string;
  onQueryChange: (query: string) => void;
  onConfirm: () => void;
  onSelectSale: (sale: SaleWithProduct) => void;
};

function formatSaleDropdownLine(sale: SaleWithProduct) {
  const parts = [
    sale.customer_name,
    sale.products?.product_name,
    sale.products?.model_name,
    sale.products?.sku,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "-";
}

export default function SalesListSearch({
  sales,
  query,
  onQueryChange,
  onConfirm,
  onSelectSale,
}: SalesListSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);

  const filteredSales = useMemo(
    () => filterSalesByTextQuery(sales, query).slice(0, MAX_RESULTS),
    [sales, query],
  );

  function updateDropdownPosition() {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 360),
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
  }, [isOpen]);

  const dropdown =
    isOpen && query.trim() && dropdownPosition ? (
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
        {filteredSales.length === 0 ? (
          <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            검색 결과가 없습니다.
          </li>
        ) : (
          filteredSales.map((sale) => (
            <li key={sale.id}>
              <button
                type="button"
                role="option"
                onClick={() => {
                  onSelectSale(sale);
                  setIsOpen(false);
                }}
                className="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <span
                  className="block truncate text-[12px] leading-none text-zinc-900 dark:text-zinc-100"
                  title={formatSaleDropdownLine(sale)}
                >
                  {formatSaleDropdownLine(sale)}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <label htmlFor="sales_list_search" className="sr-only">
        고객명, 제품명, 모델명, SKU 검색
      </label>
      <input
        ref={inputRef}
        id="sales_list_search"
        type="text"
        role="combobox"
        aria-expanded={isOpen && query.trim().length > 0}
        aria-autocomplete="list"
        placeholder="고객명, 제품명, 모델명, SKU 검색..."
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
          if (event.key === "Enter") {
            event.preventDefault();
            onConfirm();
            setIsOpen(false);
          }
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        className={inputClass}
        style={{ fontSize: 12 }}
        autoComplete="off"
      />

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
