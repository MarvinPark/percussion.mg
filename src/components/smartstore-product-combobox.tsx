"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchProductsForSaleDropdown } from "@/app/(main)/products/actions";
import ProductSearchResultRow from "@/components/product-search-result-row";
import type { SaleProductOption } from "@/types/sale";

const compactInputClass =
  "h-[26px] w-44 rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-none text-zinc-900 placeholder:text-xs placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:w-52";

const MAX_RESULTS = 40;

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type SmartstoreProductComboboxProps = {
  products: SaleProductOption[];
  selectedProductId: string;
  autoMatchedProductId?: string | null;
  disabled?: boolean;
  onSelect: (productId: string) => void;
  onClear: () => void;
};

function productLabel(product: SaleProductOption) {
  return `${product.model_name} · ${product.product_name}`;
}

export default function SmartstoreProductCombobox({
  products,
  selectedProductId,
  autoMatchedProductId,
  disabled = false,
  onSelect,
  onClear,
}: SmartstoreProductComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);
  const [results, setResults] = useState<SaleProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const autoMatchedProduct = useMemo(
    () =>
      products.find((product) => product.id === autoMatchedProductId) ?? null,
    [products, autoMatchedProductId],
  );

  const linkedProduct = selectedProduct ?? autoMatchedProduct;

  const [query, setQuery] = useState(() =>
    linkedProduct ? productLabel(linkedProduct) : "",
  );

  useEffect(() => {
    if (isEditing) return;
    setQuery(linkedProduct ? productLabel(linkedProduct) : "");
  }, [linkedProduct, isEditing]);

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
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (linkedProduct && trimmed === productLabel(linkedProduct)) {
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
  }, [query, linkedProduct]);

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
      setIsEditing(false);
      setQuery(linkedProduct ? productLabel(linkedProduct) : "");
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
  }, [isOpen, linkedProduct]);

  function handleSelect(product: SaleProductOption) {
    onSelect(product.id);
    setQuery(productLabel(product));
    setIsEditing(false);
    setIsOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setIsEditing(true);

    const hasQuery = value.trim().length > 0;
    setIsOpen(hasQuery);
    if (hasQuery) {
      updateDropdownPosition();
    }

    if (!value.trim()) {
      onClear();
      return;
    }

    if (linkedProduct && value !== productLabel(linkedProduct)) {
      onClear();
    }
  }

  const trimmedQuery = query.trim();
  const showDropdown =
    isOpen &&
    !disabled &&
    trimmedQuery.length > 0 &&
    (!linkedProduct || trimmedQuery !== productLabel(linkedProduct));

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
              emphasizeModelName
              onSelect={() => handleSelect(product)}
            />
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <label className="sr-only">연결 제품 검색</label>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={Boolean(showDropdown)}
        aria-autocomplete="list"
        value={query}
        disabled={disabled}
        placeholder="제품 검색..."
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          setIsEditing(true);
          if (query) {
            window.requestAnimationFrame(() => {
              inputRef.current?.select();
            });
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            setIsEditing(false);
            setQuery(linkedProduct ? productLabel(linkedProduct) : "");
          }
        }}
        className={compactInputClass}
        style={{ fontSize: 12 }}
        autoComplete="off"
      />

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
