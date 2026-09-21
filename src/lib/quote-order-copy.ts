import { isNonStockServiceItem } from "@/lib/quote-fulfillment";

const ORDER_SUPPLIER_LABEL = "CJ";

type QuoteOrderCopyItem = {
  model_name: string;
  product_name: string;
  category?: string | null;
  quantity: number;
};

export type QuoteOrderCopySource = {
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  quote_items: QuoteOrderCopyItem[];
};

export function buildQuoteOrderCopyText(
  quote: QuoteOrderCopySource,
  nonStockCategories: readonly string[],
  orderManagerName: string,
): string {
  const orderItems = quote.quote_items.filter(
    (item) => !isNonStockServiceItem(item, nonStockCategories),
  );

  const itemLines = orderItems.map(
    (item) => `${item.model_name.trim()} * ${item.quantity}ea`,
  );

  const deliveryLines = [
    quote.customer_name.trim(),
    quote.customer_phone?.trim() ?? "",
    quote.customer_address?.trim() ?? "",
  ].filter((line) => line.length > 0);

  return [
    `발주담당자 : ${orderManagerName.trim()}`,
    `[${ORDER_SUPPLIER_LABEL}]`,
    "ㅇ품목",
    ...itemLines,
    "",
    "ㅇ수령정보",
    ...deliveryLines,
  ].join("\n");
}
