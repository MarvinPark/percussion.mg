import { isShippingFeeQuoteItem } from "@/lib/quote-fulfillment";
import { SUPPLIER_INFO } from "@/types/quote";

const ORDER_SUPPLIER_LABEL = "CJ";

type QuoteOrderCopyItem = {
  model_name: string;
  product_name: string;
  quantity: number;
};

export type QuoteOrderCopySource = {
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  quote_items: QuoteOrderCopyItem[];
};

function getOrderManagerName() {
  const match = SUPPLIER_INFO.manager.match(/담당\s+(\S+)/);
  return match?.[1] ?? "전인철";
}

export function buildQuoteOrderCopyText(quote: QuoteOrderCopySource): string {
  const orderItems = quote.quote_items.filter(
    (item) => !isShippingFeeQuoteItem(item),
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
    `발주담당자 : ${getOrderManagerName()}`,
    `[${ORDER_SUPPLIER_LABEL}]`,
    "ㅇ품목",
    ...itemLines,
    "",
    "ㅇ수령정보",
    ...deliveryLines,
  ].join("\n");
}
