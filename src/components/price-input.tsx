"use client";

import { useEffect, useId, useRef, useState } from "react";
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

  useEffect(() => {
    if (!focused) {
      setText(formatDisplay(numericValue));
      if (hiddenRef.current) {
        hiddenRef.current.value = String(numericValue);
      }
    }
  }, [numericValue, focused]);

  function commit(raw: string) {
    let next = parsePriceInput(raw);
    if (min !== undefined) {
      next = Math.max(Number(min), next);
    }

    if (!isControlled) {
      setInternalValue(next);
    }

    onChange?.(next);
    setText(formatDisplay(next));

    if (hiddenRef.current) {
      hiddenRef.current.value = String(next);
    }
  }

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
          setFocused(false);
          commit(event.target.value);
          rest.onBlur?.(event);
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          const next = parsePriceInput(raw);
          if (hiddenRef.current) {
            hiddenRef.current.value = String(next);
          }
          if (isControlled) {
            onChange?.(next);
          }
        }}
        className={className}
      />
    </>
  );
}
