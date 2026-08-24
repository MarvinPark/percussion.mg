"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listPaymentMethods } from "@/app/(main)/sales/payment-methods/actions";
import { sortPaymentMethods } from "@/lib/payment-methods";
import type { PaymentMethod } from "@/types/sale";

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

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
  registerInput?: (element: HTMLInputElement | null) => void;
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

function normalizeMethods(methods: PaymentMethod[]) {
  return sortPaymentMethods(
    methods.map((method) => ({
      id: method.id,
      name: method.name,
      fee_rate: Number(method.fee_rate) || 0,
      sort_order: Number(method.sort_order) || 0,
    })),
  );
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
  registerInput,
}: PaymentMethodComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [methods, setMethods] = useState(() => normalizeMethods(paymentMethods));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMethods(normalizeMethods(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void listPaymentMethods()
      .then((result) => {
        if (cancelled || result.error) return;
        setMethods(sortPaymentMethods(result.paymentMethods));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const selectedMethod = useMemo(
    () => methods.find((method) => method.id === value) ?? null,
    [methods, value],
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
      ? methods.filter((method) =>
          methodSearchText(method).toLowerCase().includes(normalized),
        )
      : methods;

    return filtered.slice(0, 20);
  }, [methods, searchQuery]);

  function updateDropdownPosition() {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  }

  async function refreshMethods() {
    setIsLoading(true);
    try {
      const result = await listPaymentMethods();
      if (!result.error) {
        setMethods(sortPaymentMethods(result.paymentMethods));
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setHighlightIndex(0);
  }, [matches.length, searchQuery]);

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
      setQuery("");
      setIsEditing(false);
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
  }, [open]);

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
    updateDropdownPosition();

    const normalized = nextQuery.trim().toLowerCase();
    if (!normalized) return;

    const exact = methods.find(
      (method) => method.name.toLowerCase() === normalized,
    );
    if (exact) {
      onChange(exact.id);
    }
  }

  function openDropdown() {
    void refreshMethods();
    setOpen(true);
    updateDropdownPosition();
  }

  function handleFocus() {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    openDropdown();
  }

  function handleBlur() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      if (
        containerRef.current?.contains(document.activeElement) ||
        dropdownRef.current?.contains(document.activeElement)
      ) {
        return;
      }

      const normalized = query.trim().toLowerCase();
      if (normalized) {
        const matched =
          methods.find(
            (method) => method.name.toLowerCase() === normalized,
          ) ??
          methods.find((method) =>
            methodSearchText(method).toLowerCase().includes(normalized),
          );

        if (matched) {
          onChange(matched.id);
        }
      }

      setQuery("");
      setIsEditing(false);
      setOpen(false);
    }, 150);
  }

  const dropdown =
    open && dropdownPosition ? (
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
        className="max-h-56 overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
      >
        {isLoading ? (
          <li className="px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
            불러오는 중...
          </li>
        ) : matches.length === 0 ? (
          <li className="px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
            {methods.length === 0
              ? "등록된 결제 수단이 없습니다."
              : "검색 결과가 없습니다."}
          </li>
        ) : (
          matches.map((method, index) => (
            <li key={method.id}>
              <button
                type="button"
                role="option"
                aria-selected={method.id === value}
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
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className="relative min-w-0">
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <input
        ref={(node) => {
          inputRef.current = node;
          registerInput?.(node);
        }}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        required={required && !value}
        aria-label={ariaLabel}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={handleFocus}
        onClick={openDropdown}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openDropdown();
            if (matches.length > 0) {
              setHighlightIndex((prev) => (prev + 1) % matches.length);
            }
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            openDropdown();
            if (matches.length > 0) {
              setHighlightIndex(
                (prev) => (prev - 1 + matches.length) % matches.length,
              );
            }
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (open && matches[highlightIndex]) {
              handleSelect(matches[highlightIndex]);
            }
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

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
