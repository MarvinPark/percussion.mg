"use client";

import { useState } from "react";
import { FORMATTED_PHONE_MAX_LENGTH, formatPhoneNumber } from "@/lib/phone-format";

type PhoneInputProps = {
  id?: string;
  name: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
};

export default function PhoneInput({
  id,
  name,
  defaultValue = "",
  className,
  placeholder = "010, 02, 031, 070 등",
  required = false,
}: PhoneInputProps) {
  const [value, setValue] = useState(() => formatPhoneNumber(defaultValue));

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setValue(formatPhoneNumber(event.target.value));
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        required={required}
        maxLength={FORMATTED_PHONE_MAX_LENGTH}
      />
    </>
  );
}
