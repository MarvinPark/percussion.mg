"use client";

import type { ClipboardEvent } from "react";
import { parseCustomerContactPaste } from "@/lib/customer-paste-parse";

type CustomerContactPasteHandlers = {
  setCustomerName: (value: string) => void;
  setCustomerPhone: (value: string) => void;
  setCustomerAddress: (value: string) => void;
};

export function createCustomerContactPasteHandler({
  setCustomerName,
  setCustomerPhone,
  setCustomerAddress,
}: CustomerContactPasteHandlers) {
  return (event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const parsed = parseCustomerContactPaste(event.clipboardData.getData("text"));
    if (!parsed) return;

    const fieldCount = [parsed.name, parsed.phone, parsed.address].filter(
      Boolean,
    ).length;
    if (fieldCount < 2) return;

    event.preventDefault();
    if (parsed.name) setCustomerName(parsed.name);
    if (parsed.phone) setCustomerPhone(parsed.phone);
    if (parsed.address) setCustomerAddress(parsed.address);
  };
}
