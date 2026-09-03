"use client";

import { useState, type ChangeEvent, type ClipboardEventHandler } from "react";
import { extractPhoneDigits } from "@/lib/phone-format";

type PhoneInputProps = {
  id?: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onPaste?: ClipboardEventHandler<HTMLInputElement>;
  className?: string;
  placeholder?: string;
  required?: boolean;
};

export default function PhoneInput({
  id,
  name,
  defaultValue = "",
  value,
  onChange,
  onPaste,
  className,
  placeholder = "숫자만 입력",
  required = false,
}: PhoneInputProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    extractPhoneDigits(defaultValue),
  );

  const displayValue = isControlled
    ? extractPhoneDigits(value ?? "")
    : internalValue;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = extractPhoneDigits(event.target.value);
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  }

  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onPaste={onPaste}
      placeholder={placeholder}
      className={className}
      required={required}
    />
  );
}
