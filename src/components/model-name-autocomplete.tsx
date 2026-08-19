"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { searchQuoteProductsForAutocomplete } from "@/app/(main)/quotes/actions";
import ProductSearchResultRow from "@/components/product-search-result-row";
import type { QuoteProductOption } from "@/types/quote";

const inputClass =
  "w-full rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

export type ModelNameAutocompleteHandle = {
  focus: () => void;
};

type ModelNameAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct: (product: QuoteProductOption) => void;
  onRegisterProduct?: (query: string) => void;
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
    value,
    onChange,
    onSelectProduct,
    onRegisterProduct,
    placeholder = "모델명 입력",
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [matches, setMatches] = useState<QuoteProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = value.trim();
  const showRegisterOption =
    Boolean(onRegisterProduct) &&
    Boolean(query) &&
    !isSearching &&
    matches.length === 0;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    const query = value.trim();
    if (!query) {
      setMatches([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void searchQuoteProductsForAutocomplete(query).then((response) => {
        setMatches(response.products);
        setIsSearching(false);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

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

  function handleRegister() {
    if (!onRegisterProduct || !query) return;
    onRegisterProduct(query);
    setOpen(false);
  }

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
          if (!open) return;

          if (showRegisterOption) {
            if (event.key === "Enter") {
              event.preventDefault();
              handleRegister();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
            return;
          }

          if (matches.length === 0) return;
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

      {open && query ? (
        isSearching ? (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-500 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            검색 중…
          </div>
        ) : matches.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
            {matches.map((product, index) => (
              <ProductSearchResultRow
                key={product.id}
                product={product}
                emphasizeModelName
                highlighted={index === highlightIndex}
                onHighlight={() => setHighlightIndex(index)}
                resultIndex={index}
                onSelect={() => handleSelect(product)}
              />
            ))}
          </ul>
        ) : showRegisterOption ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleRegister}
                className="block w-full px-3 py-2.5 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                + 제품등록
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  「{query}」 검색 결과 없음 · 새 제품 등록
                </span>
              </button>
            </li>
          </ul>
        ) : (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-500 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            검색 결과가 없습니다.
          </div>
        )
      ) : null}
    </div>
  );
});

export default ModelNameAutocomplete;
