"use client";

import { useState } from "react";
import { FORMATTED_PHONE_MAX_LENGTH, formatPhoneNumber } from "@/lib/phone-format";

type PhoneInputProps = {
  id?: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
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
  className,
  placeholder = "010, 02, 031, 070 등",
  required = false,
}: PhoneInputProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    formatPhoneNumber(defaultValue),
  );

  const displayValue = isControlled
    ? formatPhoneNumber(value ?? "")
    : internalValue;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = formatPhoneNumber(event.target.value);
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  }

  return (
    <>
      <input type="hidden" name={name} value={displayValue} />
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        required={required}
        maxLength={FORMATTED_PHONE_MAX_LENGTH}
      />
    </>
  );
}
