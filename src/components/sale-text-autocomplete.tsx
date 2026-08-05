"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MIN_QUERY_LENGTH = 2;

type SaleTextAutocompleteProps = {
  id?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
};

export default function SaleTextAutocomplete({
  id,
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  className = "",
}: SaleTextAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const matches = useMemo(() => {
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) return [];

    const normalized = query.toLowerCase();
    return suggestions
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [suggestions, value]);

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

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          setOpen(nextValue.trim().length >= MIN_QUERY_LENGTH);
        }}
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
        className={className}
      />

      {open && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {matches.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === highlightIndex
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
