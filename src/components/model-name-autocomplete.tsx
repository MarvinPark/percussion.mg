"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QuoteProductOption } from "@/types/quote";
import { formatKRW } from "@/lib/sales-calculator";

const inputClass =
  "w-full rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

export type ModelNameAutocompleteHandle = {
  focus: () => void;
};

type ModelNameAutocompleteProps = {
  products: QuoteProductOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectProduct: (product: QuoteProductOption) => void;
  placeholder?: string;
};

function productSearchLabel(product: QuoteProductOption) {
  return product.model_name || product.sku;
}

const ModelNameAutocomplete = forwardRef<
  ModelNameAutocompleteHandle,
  ModelNameAutocompleteProps
>(function ModelNameAutocomplete(
  {
    products,
    value,
    onChange,
    onSelectProduct,
    placeholder = "모델명 입력",
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    return products
      .filter((product) => {
        const targets = [
          product.model_name,
          product.sku,
          product.product_name,
          product.brand ?? "",
          product.supplier ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return targets.includes(query);
      })
      .slice(0, 8);
  }, [products, value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [matches.length, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(product: QuoteProductOption) {
    onSelectProduct(product);
    onChange(productSearchLabel(product));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open || matches.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightIndex((prev) => (prev + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightIndex(
              (prev) => (prev - 1 + matches.length) % matches.length,
            );
          } else if (event.key === "Enter" && matches[highlightIndex]) {
            event.preventDefault();
            handleSelect(matches[highlightIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />

      {open && value.trim() && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {matches.map((product, index) => (
            <li key={product.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(product)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === highlightIndex
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="font-medium">
                  {productSearchLabel(product)}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {product.supplier ? `[${product.supplier}] ` : ""}
                  {product.product_name}
                  {product.brand ? ` · ${product.brand}` : ""}
                  {" · 매입가 "}
                  {formatKRW(product.purchase_price)}원
                  {product.sku ? ` · ${product.sku}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});

export default ModelNameAutocomplete;
