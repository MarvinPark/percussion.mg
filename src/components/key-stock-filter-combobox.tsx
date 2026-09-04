"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 40;

type KeyStockFilterComboboxProps = {
  id: string;
  value: string;
  options: string[];
  placeholder?: string;
  /** value가 비어 있을 때 입력란에 표시할 라벨 (예: 전체) */
  emptyLabel?: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function KeyStockFilterCombobox({
  id,
  value,
  options,
  placeholder = "전체",
  emptyLabel,
  onChange,
  className = "",
}: KeyStockFilterComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (isFocused) return;
    setQuery(value);
  }, [isFocused, value]);

  const displayValue = isFocused
    ? query
    : value.trim() || emptyLabel || "";

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? options.filter((option) =>
          option.toLowerCase().includes(normalizedQuery),
        )
      : options;

    return filtered.slice(0, MAX_RESULTS);
  }, [options, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [matches.length, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        resolveInputOnDismiss();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [options, query, value]);

  function resolveInputOnDismiss() {
    setOpen(false);
    const trimmed = query.trim();
    if (!trimmed || (emptyLabel && trimmed === emptyLabel)) {
      if (value) commitValue("");
      else setQuery("");
      return;
    }

    const exact = options.find(
      (option) => option.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exact) {
      commitValue(exact);
      return;
    }

    setQuery(value);
  }

  function commitValue(nextValue: string) {
    onChange(nextValue);
    setQuery(nextValue);
    setOpen(false);
  }

  function handleBlur() {
    resolveInputOnDismiss();
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input
        id={id}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setIsFocused(true);
          setOpen(true);
          setQuery(value.trim());
        }}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setIsFocused(false);
          handleBlur();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            if (matches.length > 0) {
              setHighlightIndex((prev) => (prev + 1) % matches.length);
            }
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            if (matches.length > 0) {
              setHighlightIndex(
                (prev) => (prev - 1 + matches.length) % matches.length,
              );
            }
            return;
          }

          if (event.key === "Enter" && open && matches[highlightIndex]) {
            event.preventDefault();
            commitValue(matches[highlightIndex]);
            return;
          }

          if (event.key === "Escape") {
            setOpen(false);
            setQuery(value);
            setIsFocused(false);
          }
        }}
        className={className}
      />

      {open && matches.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {!query.trim() ? (
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitValue("")}
                className="block w-full px-3 py-2 text-left text-xs text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                전체
              </button>
            </li>
          ) : null}
          {matches.map((option, index) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitValue(option)}
                className={`block w-full px-3 py-2 text-left text-xs ${
                  index === highlightIndex
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
