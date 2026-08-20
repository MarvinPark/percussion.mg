"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { searchProductsForSaleDropdown } from "@/app/(main)/products/actions";
import ProductSearchResultRow from "@/components/product-search-result-row";
import { formatLinkedProductDisplayLabel } from "@/lib/product-search";
import type { SaleProductOption } from "@/types/sale";

const compactInputClass =
  "h-[26px] w-44 rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-none text-zinc-900 placeholder:text-xs placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:w-52";

const MAX_RESULTS = 40;

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type MarketplaceProductComboboxProps = {
  products: SaleProductOption[];
  selectedProductId: string;
  autoMatchedProductId?: string | null;
  linkedProductLabel?: string | null;
  disabled?: boolean;
  onSelect: (product: SaleProductOption) => void;
  onClear: () => void;
  nextFocusRef?: RefObject<HTMLInputElement | null>;
};

function productLabel(product: SaleProductOption) {
  return formatLinkedProductDisplayLabel(product);
}

function resolveLinkedProduct(
  products: SaleProductOption[],
  selectedProductId: string,
  pinnedProduct: SaleProductOption | null,
) {
  if (!selectedProductId) return null;

  return (
    products.find((product) => product.id === selectedProductId) ??
    (pinnedProduct?.id === selectedProductId ? pinnedProduct : null)
  );
}

function resolveDisplayLabel(
  linkedProduct: SaleProductOption | null,
  selectedProductId: string,
  linkedProductLabel?: string | null,
) {
  if (linkedProduct) return productLabel(linkedProduct);
  if (selectedProductId && linkedProductLabel) return linkedProductLabel;
  return "";
}

export default function MarketplaceProductCombobox({
  products,
  selectedProductId,
  linkedProductLabel,
  disabled = false,
  onSelect,
  onClear,
  nextFocusRef,
}: MarketplaceProductComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);
  const [results, setResults] = useState<SaleProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pinnedProduct, setPinnedProduct] = useState<SaleProductOption | null>(
    null,
  );
  const [highlightIndex, setHighlightIndex] = useState(0);

  const linkedProduct = useMemo(
    () =>
      resolveLinkedProduct(products, selectedProductId, pinnedProduct),
    [products, selectedProductId, pinnedProduct],
  );

  const displayLabel = useMemo(
    () => resolveDisplayLabel(linkedProduct, selectedProductId, linkedProductLabel),
    [linkedProduct, selectedProductId, linkedProductLabel],
  );

  const [query, setQuery] = useState(() => displayLabel);

  useEffect(() => {
    if (isEditing) return;

    if (selectedProductId && !linkedProduct && !linkedProductLabel) {
      return;
    }

    setQuery(displayLabel);
  }, [selectedProductId, displayLabel, linkedProduct, linkedProductLabel, isEditing]);

  useEffect(() => {
    if (selectedProductId) return;
    setPinnedProduct(null);
  }, [selectedProductId]);

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
    if (!trimmed || !isEditing) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (displayLabel && trimmed === displayLabel) {
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
  }, [query, displayLabel, isEditing]);

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
      setQuery(displayLabel);
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
  }, [isOpen, displayLabel]);

  function handleSelect(product: SaleProductOption) {
    setPinnedProduct(product);
    setQuery(productLabel(product));
    setIsEditing(false);
    setIsOpen(false);
    onSelect(product);
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
      setPinnedProduct(null);
      onClear();
      return;
    }

    if (selectedProductId || displayLabel) {
      onClear();
    }
  }

  const trimmedQuery = query.trim();
  const showDropdown =
    isOpen &&
    !disabled &&
    isEditing &&
    trimmedQuery.length > 0 &&
    trimmedQuery !== displayLabel;

  function handleSelectHighlighted() {
    const product = results[highlightIndex];
    if (!product) return;
    handleSelect(product);
  }

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
            if (showDropdown && !isSearching && results.length > 0) {
              event.preventDefault();
              handleSelectHighlighted();
            }
            return;
          }

          if (event.key === "Tab") {
            if (showDropdown) {
              setIsOpen(false);
              setIsEditing(false);
              if (!pinnedProduct && !selectedProductId) {
                setQuery(displayLabel);
              }
            }
            if (!event.shiftKey && nextFocusRef?.current) {
              event.preventDefault();
              nextFocusRef.current.focus();
            }
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            setIsEditing(false);
            setQuery(displayLabel);
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
