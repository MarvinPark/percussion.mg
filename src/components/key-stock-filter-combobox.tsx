"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 40;

type KeyStockFilterComboboxProps = {
  id: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function KeyStockFilterCombobox({
  id,
  value,
  options,
  placeholder = "전체",
  onChange,
  className = "",
}: KeyStockFilterComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    const filtered = query
      ? options.filter((option) => option.toLowerCase().includes(query))
      : options;

    return filtered.slice(0, MAX_RESULTS);
  }, [options, value]);

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
    <div ref={containerRef} className="relative min-w-0">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
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
            handleSelect(matches[highlightIndex]);
            return;
          }

          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />

      {open && matches.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {value.trim() ? null : (
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect("")}
                className="block w-full px-3 py-2 text-left text-xs text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                전체
              </button>
            </li>
          )}
          {matches.map((option, index) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
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
