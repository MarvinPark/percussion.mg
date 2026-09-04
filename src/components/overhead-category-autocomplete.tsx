"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatOverheadCategoryLabel,
  groupOverheadCategories,
  searchOverheadCategories,
} from "@/lib/overhead-expenses";
import type { OverheadCategory } from "@/types/overhead";

const MIN_QUERY_LENGTH = 1;

type OverheadCategoryAutocompleteProps = {
  id?: string;
  categories: OverheadCategory[];
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function OverheadCategoryAutocomplete({
  id,
  categories,
  categoryId,
  onCategoryChange,
  placeholder = "대분류·세부항목 검색",
  className = "",
  required = false,
}: OverheadCategoryAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const [query, setQuery] = useState(() =>
    selectedCategory ? formatOverheadCategoryLabel(selectedCategory) : "",
  );
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const matches = useMemo(() => {
    if (showAll) return categories;
    return searchOverheadCategories(categories, query);
  }, [categories, query, showAll]);

  const groupedMatches = useMemo(
    () => groupOverheadCategories(matches),
    [matches],
  );

  const groupedMatchesWithIndex = useMemo(() => {
    let index = 0;
    return groupedMatches.map((group) => ({
      ...group,
      items: group.items.map((category) => ({
        category,
        index: index++,
      })),
    }));
  }, [groupedMatches]);

  const flatMatches = useMemo(
    () => groupedMatches.flatMap((group) => group.items),
    [groupedMatches],
  );

  useEffect(() => {
    setQuery(
      selectedCategory ? formatOverheadCategoryLabel(selectedCategory) : "",
    );
  }, [selectedCategory]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [flatMatches.length, query, showAll]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setShowAll(false);
        if (selectedCategory) {
          setQuery(formatOverheadCategoryLabel(selectedCategory));
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCategory]);

  function handleSelect(category: OverheadCategory) {
    onCategoryChange(category.id);
    setQuery(formatOverheadCategoryLabel(category));
    setOpen(false);
    setShowAll(false);
  }

  function openDropdown(options?: { showAll?: boolean }) {
    setOpen(true);
    setShowAll(Boolean(options?.showAll));
    inputRef.current?.focus();
  }

  function toggleAllItems() {
    if (open && showAll) {
      setOpen(false);
      setShowAll(false);
      return;
    }
    openDropdown({ showAll: true });
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          required={required && !categoryId}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setShowAll(false);
            setOpen(nextValue.trim().length >= MIN_QUERY_LENGTH);
            if (
              selectedCategory &&
              nextValue !== formatOverheadCategoryLabel(selectedCategory)
            ) {
              onCategoryChange("");
            }
          }}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (open && flatMatches[highlightIndex]) {
                handleSelect(flatMatches[highlightIndex]);
              }
              return;
            }

            if (!open || flatMatches.length === 0) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightIndex((prev) => (prev + 1) % flatMatches.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightIndex(
                (prev) => (prev - 1 + flatMatches.length) % flatMatches.length,
              );
            } else if (event.key === "Escape") {
              setOpen(false);
              setShowAll(false);
            }
          }}
          className={`${className} pr-9`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="전체 항목 보기"
          onClick={toggleAllItems}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ChevronDownIcon open={open && showAll} />
        </button>
      </div>

      {open && flatMatches.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {groupedMatchesWithIndex.map((group) => (
              <li key={group.group_name} role="presentation">
                <div className="sticky top-0 border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {group.group_name}
                </div>
                <ul>
                  {group.items.map(({ category, index }) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(category)}
                        className={`block w-full py-2 pr-3 pl-5 text-left text-sm ${
                          index === highlightIndex
                            ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                            : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {category.item_name}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ul>
      ) : open && showAll ? (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-500 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          등록된 항목이 없습니다.
        </p>
      ) : null}
    </div>
  );
}
