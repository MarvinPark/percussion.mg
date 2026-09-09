"use client";

import { useEffect, useRef, useState } from "react";
import PriceInput from "@/components/price-input";
import { formatKRW } from "@/lib/sales-calculator";

export const QUOTE_CELL_HEIGHT_CLASS = "h-9 min-h-[2.25rem]";
export const QUOTE_CELL_TEXT_CLASS = "text-xs leading-9";

export type QuoteCellAlign = "left" | "center" | "right";

const cellBaseClass = `min-w-0 px-1.5 ${QUOTE_CELL_HEIGHT_CLASS} ${QUOTE_CELL_TEXT_CLASS} transition-colors`;

const cellEditableDisplayClass = `${cellBaseClass} flex w-full cursor-text items-center bg-white text-slate-900 hover:bg-slate-50 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800/90`;

const cellEditingClass = `${cellBaseClass} w-full rounded-sm border border-blue-400 bg-white text-slate-900 outline-none ring-2 ring-blue-500/20 dark:bg-white dark:text-slate-900`;

const cellEmptyClass = "text-slate-400";

const selectEditableClass = `${cellBaseClass} w-full cursor-pointer appearance-none bg-white text-slate-900 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-300 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800/90 dark:focus:bg-slate-900`;

function cellAlignClass(align: QuoteCellAlign) {
  if (align === "right") {
    return "justify-end text-right";
  }
  if (align === "left") {
    return "justify-start text-left";
  }
  return "justify-center text-center";
}

type QuoteInlineTextCellProps = {
  value: string;
  placeholder?: string;
  align?: QuoteCellAlign;
  onChange: (value: string) => void;
};

export function QuoteInlineTextCell({
  value,
  placeholder = "입력",
  align = "left",
  onChange,
}: QuoteInlineTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function commit() {
    onChange(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={`${cellEditingClass} ${cellAlignClass(align)}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${cellEditableDisplayClass} ${cellAlignClass(align)} ${
        value.trim() ? "" : cellEmptyClass
      }`}
    >
      <span className="block w-full truncate">
        {value.trim() || placeholder}
      </span>
    </button>
  );
}

type QuoteInlineNumberCellProps = {
  value: number;
  min?: number;
  align?: QuoteCellAlign;
  onChange: (value: number) => void;
};

export function QuoteInlineNumberCell({
  value,
  min = 1,
  align = "right",
  onChange,
}: QuoteInlineNumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function commit() {
    const parsed = Math.max(min, Math.round(Number(draft) || min));
    onChange(parsed);
    setEditing(false);
  }

  function cancel() {
    setDraft(String(value));
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={`${cellEditingClass} ${cellAlignClass(align)} tabular-nums`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${cellEditableDisplayClass} ${cellAlignClass(align)} tabular-nums`}
    >
      {value}
    </button>
  );
}

type QuoteInlinePriceCellProps = {
  value: number;
  min?: number;
  align?: QuoteCellAlign;
  onChange: (value: number) => void;
};

export function QuoteInlinePriceCell({
  value,
  min = 0,
  align = "right",
  onChange,
}: QuoteInlinePriceCellProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <PriceInput
        autoFocus
        min={min}
        value={value}
        onChange={onChange}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
        className={`${cellEditingClass} ${cellAlignClass(align)} tabular-nums`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${cellEditableDisplayClass} ${cellAlignClass(align)} tabular-nums`}
    >
      {formatKRW(value)}
    </button>
  );
}

type QuoteInlineSelectCellProps = {
  value: string;
  options: readonly string[];
  align?: QuoteCellAlign;
  onChange: (value: string) => void;
};

export function QuoteInlineSelectCell({
  value,
  options,
  align = "center",
  onChange,
}: QuoteInlineSelectCellProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${selectEditableClass} ${cellAlignClass(align)}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

