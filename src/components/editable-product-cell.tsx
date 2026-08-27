"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProductField,
  type ProductInlineField,
} from "@/app/(main)/products/actions";
import { tableFocusRingClass } from "@/lib/product-table-navigation";
import { formatKRW, parsePriceInput } from "@/lib/sales-calculator";

const inputClass =
  "w-full min-w-0 rounded border border-blue-400 bg-white px-1 py-0.5 text-sm font-normal text-zinc-900 outline-none focus:ring-1 focus:ring-blue-500 max-md:text-base max-md:leading-normal dark:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100";

type EditableProductCellProps = {
  productId: string;
  field: ProductInlineField;
  value: string;
  displayValue?: string;
  inputType?: "text" | "number";
  formatAsPrice?: boolean;
  className?: string;
  isEditing?: boolean;
  isFocused?: boolean;
  onRequestEdit?: () => void;
  onNavigate?: (direction: "forward" | "backward") => void;
  onFinishEdit?: () => void;
  readOnly?: boolean;
};

export default function EditableProductCell({
  productId,
  field,
  value,
  displayValue,
  inputType = "text",
  formatAsPrice = false,
  className = "",
  isEditing: controlledEditing = false,
  isFocused = false,
  onRequestEdit,
  onNavigate,
  onFinishEdit,
  readOnly = false,
}: EditableProductCellProps) {
  if (readOnly) {
    return (
      <span className={className}>{(displayValue ?? value) || "-"}</span>
    );
  }
  const router = useRouter();
  const [internalEditing, setInternalEditing] = useState(false);
  const isControlled = onRequestEdit !== undefined;
  const editing = isControlled ? controlledEditing : internalEditing;
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const tabbingRef = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function requestEdit() {
    setDraft(formatAsPrice ? formatKRW(value) : value);
    setError(null);
    if (isControlled) {
      onRequestEdit?.();
    } else {
      setInternalEditing(true);
    }
  }

  function finishEdit() {
    if (isControlled) {
      onFinishEdit?.();
    } else {
      setInternalEditing(false);
    }
  }

  async function save() {
    if (savingRef.current) return true;

    const trimmed = draft.trim();
    const normalizedDraft = formatAsPrice
      ? String(parsePriceInput(trimmed))
      : trimmed;
    const normalizedValue = formatAsPrice
      ? String(parsePriceInput(value.trim()))
      : value.trim();

    if (normalizedDraft === normalizedValue) {
      setError(null);
      return true;
    }

    savingRef.current = true;

    const result = await updateProductField(productId, field, normalizedDraft);

    savingRef.current = false;

    if (result.error) {
      setError(result.error);
      setDraft(value);
      return false;
    }

    setError(null);
    router.refresh();
    return true;
  }

  function cancel() {
    setDraft(value);
    setError(null);
    finishEdit();
  }

  function startEditing(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    requestEdit();
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={formatAsPrice ? "text" : inputType}
        inputMode={formatAsPrice ? "numeric" : undefined}
        value={draft}
        min={inputType === "number" && !formatAsPrice ? 0 : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (tabbingRef.current) {
            tabbingRef.current = false;
            return;
          }
          void (async () => {
            await save();
            finishEdit();
          })();
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();

          if (event.key === "Enter") {
            event.preventDefault();
            void (async () => {
              await save();
              finishEdit();
            })();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
            return;
          }

          if (event.key === "Tab") {
            event.preventDefault();
            tabbingRef.current = true;
            void (async () => {
              await save();
              if (onNavigate) {
                onNavigate(event.shiftKey ? "backward" : "forward");
              } else {
                finishEdit();
              }
            })();
          }
        }}
        className={`${inputClass} touch-manipulation ${className}`}
      />
    );
  }

  return (
    <span
      data-editable-cell
      title={error ?? "더블클릭하여 수정"}
      tabIndex={isFocused ? 0 : -1}
      onDoubleClick={startEditing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          requestEdit();
        }
        if (event.key === "Tab" && onNavigate) {
          event.preventDefault();
          onNavigate(event.shiftKey ? "backward" : "forward");
        }
      }}
      className={`block truncate touch-manipulation rounded ${error ? "text-red-600" : ""} ${
        isFocused ? tableFocusRingClass : ""
      } ${className}`}
    >
      {displayValue ?? value}
    </span>
  );
}
