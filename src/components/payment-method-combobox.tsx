"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PaymentMethod } from "@/types/sale";

type PaymentMethodComboboxProps = {
  id?: string;
  name?: string;
  paymentMethods: PaymentMethod[];
  value: string;
  onChange: (paymentMethodId: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  showFeeInLabel?: boolean;
  "aria-label"?: string;
};

function methodLabel(method: PaymentMethod, showFee: boolean) {
  if (!showFee || method.fee_rate <= 0) {
    return method.name;
  }
  return `${method.name} (${method.fee_rate}%)`;
}

function methodSearchText(method: PaymentMethod) {
  return `${method.name} ${method.fee_rate}`;
}

export default function PaymentMethodCombobox({
  id,
  name,
  paymentMethods,
  value,
  onChange,
  className = "",
  placeholder = "결제 방식 검색",
  required = false,
  showFeeInLabel = true,
  "aria-label": ariaLabel,
}: PaymentMethodComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.id === value) ?? null,
    [paymentMethods, value],
  );

  const searchQuery = isEditing || query ? query : "";

  const displayValue =
    isEditing || query
      ? query
      : selectedMethod
        ? methodLabel(selectedMethod, showFeeInLabel)
        : "";

  const matches = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    const filtered = normalized
      ? paymentMethods.filter((method) =>
          methodSearchText(method).toLowerCase().includes(normalized),
        )
      : paymentMethods;

    return filtered.slice(0, 12);
  }, [paymentMethods, searchQuery]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [matches.length, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
        setIsEditing(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(method: PaymentMethod) {
    onChange(method.id);
    setQuery("");
    setIsEditing(false);
    setOpen(false);
  }

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery);
    setIsEditing(true);
    setOpen(true);

    const normalized = nextQuery.trim().toLowerCase();
    if (!normalized) return;

    const exact = paymentMethods.find(
      (method) => method.name.toLowerCase() === normalized,
    );
    if (exact) {
      onChange(exact.id);
    }
  }

  function handleFocus() {
    setOpen(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (
        containerRef.current &&
        document.activeElement &&
        containerRef.current.contains(document.activeElement)
      ) {
        return;
      }

      const normalized = query.trim().toLowerCase();
      if (normalized) {
        const matched =
          paymentMethods.find(
            (method) => method.name.toLowerCase() === normalized,
          ) ??
          paymentMethods.find((method) =>
            methodSearchText(method).toLowerCase().includes(normalized),
          );

        if (matched) {
          onChange(matched.id);
        }
      }

      setQuery("");
      setIsEditing(false);
      setOpen(false);
    }, 0);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        required={required && !value}
        aria-label={ariaLabel}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={handleFocus}
        onClick={() => setOpen(true)}
        onBlur={handleBlur}
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
            setQuery("");
            setIsEditing(false);
          }
        }}
        className={className}
      />

      {open && matches.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {matches.map((method, index) => (
            <li key={method.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(method)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === highlightIndex
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="font-medium">{method.name}</span>
                {method.fee_rate > 0 ? (
                  <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                    수수료 {method.fee_rate}%
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
