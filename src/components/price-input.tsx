"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatKRW, parsePriceInput } from "@/lib/sales-calculator";

type PriceInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
};

function formatDisplay(value: number) {
  return formatKRW(value);
}

export default function PriceInput({
  value,
  defaultValue = 0,
  onChange,
  name,
  className = "",
  min = 0,
  required,
  id,
  ...rest
}: PriceInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const numericValue = isControlled ? value : internalValue;
  const [text, setText] = useState(() => formatDisplay(numericValue));
  const [focused, setFocused] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const visibleRef = useRef<HTMLInputElement>(null);
  const lastSyncedValueRef = useRef(numericValue);

  const syncHiddenValue = useCallback((next: number) => {
    if (hiddenRef.current) {
      hiddenRef.current.value = String(next);
    }
  }, []);

  const commit = useCallback(
    (raw: string) => {
      let next = parsePriceInput(raw);
      if (min !== undefined) {
        next = Math.max(Number(min), next);
      }

      if (!isControlled) {
        setInternalValue(next);
      }

      lastSyncedValueRef.current = next;
      onChange?.(next);
      setText(formatDisplay(next));
      syncHiddenValue(next);

      return next;
    },
    [isControlled, min, onChange, syncHiddenValue],
  );

  useEffect(() => {
    if (focused) return;
    if (lastSyncedValueRef.current === numericValue) return;
    lastSyncedValueRef.current = numericValue;
    setText(formatDisplay(numericValue));
    syncHiddenValue(numericValue);
  }, [focused, numericValue, syncHiddenValue]);

  useEffect(() => {
    const visible = visibleRef.current;
    if (!visible || !name) return;

    const form = visible.closest("form");
    if (!form) return;

    function handleSubmit() {
      commit(visible!.value);
    }

    form.addEventListener("submit", handleSubmit, true);
    return () => form.removeEventListener("submit", handleSubmit, true);
  }, [commit, name]);

  return (
    <>
      {name ? (
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          defaultValue={defaultValue}
        />
      ) : null}
      <input
        {...rest}
        ref={visibleRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        required={required}
        value={text}
        aria-required={required}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          commit(event.target.value);
          setFocused(false);
          rest.onBlur?.(event);
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          const next = parsePriceInput(raw);
          const clamped =
            min !== undefined ? Math.max(Number(min), next) : next;

          if (!isControlled) {
            setInternalValue(clamped);
          }

          lastSyncedValueRef.current = clamped;
          onChange?.(clamped);
          syncHiddenValue(clamped);
        }}
        className={className}
      />
    </>
  );
}
