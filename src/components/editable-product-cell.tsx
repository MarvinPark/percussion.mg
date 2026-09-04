"use client";

import { useEffect, useRef, useState } from "react";
import {
  updateProductField,
  type ProductInlineField,
} from "@/app/(main)/products/actions";
import ConfirmDialog from "@/components/confirm-dialog";
import { tableFocusRingClass } from "@/lib/product-table-navigation";
import { formatKRW, parsePriceInput } from "@/lib/sales-calculator";

const inputClass =
  "w-full min-w-0 rounded border border-blue-400 bg-white px-1 py-0.5 text-sm font-normal text-zinc-900 outline-none focus:ring-1 focus:ring-blue-500 max-md:text-base max-md:leading-normal dark:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100";

const STOCK_LOCATION_FIELDS = new Set<ProductInlineField>([
  "stock_floor3",
  "stock_b1",
  "stock_display",
]);

const STOCK_LOCATION_LABELS: Partial<Record<ProductInlineField, string>> = {
  stock_floor3: "3층",
  stock_b1: "B1",
  stock_display: "의왕",
};

type InboundPromptState = {
  normalizedDraft: string;
  delta: number;
};

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
  onFieldSaved?: (value: string) => void;
  readOnly?: boolean;
};

function isStockLocationField(field: ProductInlineField) {
  return STOCK_LOCATION_FIELDS.has(field);
}

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
  onFieldSaved,
  readOnly = false,
}: EditableProductCellProps) {
  if (readOnly) {
    return (
      <span className={className}>{(displayValue ?? value) || "-"}</span>
    );
  }
  const [internalEditing, setInternalEditing] = useState(false);
  const isControlled = onRequestEdit !== undefined;
  const editing = isControlled ? controlledEditing : internalEditing;
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [inboundPrompt, setInboundPrompt] = useState<InboundPromptState | null>(
    null,
  );
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

  async function commitSave(options?: { recordAsInbound?: boolean }) {
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

    if (
      options === undefined &&
      isStockLocationField(field) &&
      inputType === "number"
    ) {
      const newQty = Number(normalizedDraft);
      const oldQty = Number(normalizedValue);
      if (
        !Number.isNaN(newQty) &&
        !Number.isNaN(oldQty) &&
        newQty > oldQty
      ) {
        setInboundPrompt({
          normalizedDraft,
          delta: newQty - oldQty,
        });
        return false;
      }
    }

    savingRef.current = true;

    const result = await updateProductField(
      productId,
      field,
      normalizedDraft,
      options?.recordAsInbound !== undefined
        ? { recordAsInbound: options.recordAsInbound }
        : undefined,
    );

    savingRef.current = false;

    if (result.error) {
      setError(result.error);
      setDraft(value);
      return false;
    }

    setError(null);
    onFieldSaved?.(normalizedDraft);
    return true;
  }

  async function save(options?: { recordAsInbound?: boolean }) {
    return commitSave(options);
  }

  async function handleInboundChoice(recordAsInbound: boolean) {
    if (!inboundPrompt) return;

    setInboundPrompt(null);
    const saved = await save({ recordAsInbound });
    if (saved) {
      finishEdit();
    }
  }

  function cancel() {
    setInboundPrompt(null);
    setDraft(value);
    setError(null);
    finishEdit();
  }

  function startEditing(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    requestEdit();
  }

  const locationLabel = STOCK_LOCATION_LABELS[field] ?? "재고";

  if (editing) {
    return (
      <>
        <input
          ref={inputRef}
          type={formatAsPrice ? "text" : inputType}
          inputMode={formatAsPrice ? "numeric" : undefined}
          value={draft}
          min={inputType === "number" && !formatAsPrice ? 0 : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (tabbingRef.current || inboundPrompt) {
              tabbingRef.current = false;
              return;
            }
            void (async () => {
              const saved = await save();
              if (saved) finishEdit();
            })();
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter") {
              event.preventDefault();
              void (async () => {
                const saved = await save();
                if (saved) finishEdit();
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
                const saved = await save();
                if (!saved) return;
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

        {inboundPrompt ? (
          <ConfirmDialog
            title="입고로 기록할까요?"
            description={`${locationLabel} 재고가 ${inboundPrompt.delta}개 증가합니다. 입고 기록으로 남길까요?`}
            confirmLabel="입고로 기록"
            cancelLabel="수량만 변경"
            onConfirm={() => void handleInboundChoice(true)}
            onCancel={() => void handleInboundChoice(false)}
          />
        ) : null}
      </>
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
