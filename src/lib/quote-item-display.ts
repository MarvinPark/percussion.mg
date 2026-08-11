import type { QuoteItemInput } from "@/types/quote";

export type QuoteItemVariantLine = {
  label: string;
  value: string;
};

export function getQuoteItemVariantLines(
  item: Pick<QuoteItemInput, "color" | "product_option" | "size">,
): QuoteItemVariantLine[] {
  const lines: QuoteItemVariantLine[] = [];

  if (item.color?.trim()) {
    lines.push({ label: "색상", value: item.color.trim() });
  }
  if (item.product_option?.trim()) {
    lines.push({ label: "옵션", value: item.product_option.trim() });
  }
  if (item.size?.trim()) {
    lines.push({ label: "사이즈", value: item.size.trim() });
  }

  return lines;
}
