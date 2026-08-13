import { calculateQuoteLine, calculateQuoteTotals } from "@/lib/quote-calculator";
import { parseFulfillmentLocation } from "@/lib/quote-fulfillment";
import { displaySaleCategory } from "@/lib/sale-categories";
import type { QuoteFormData, QuoteItemInput } from "@/types/quote";

type DbQuoteItem = {
  id: string;
  product_id: string | null;
  supplier: string | null;
  purchase_source: string | null;
  fulfillment_location?: string | null;
  category: string | null;
  brand: string | null;
  product_name: string;
  model_name: string;
  color?: string | null;
  product_option?: string | null;
  size?: string | null;
  quantity: number;
  consumer_price: number;
  sale_unit_price: number;
  rounded_unit_price: number;
  line_total: number;
  purchase_price: number;
  shipping_cost: number;
  products?: {
    color: string | null;
    product_option: string | null;
    size: string | null;
  } | null;
};

function resolveQuoteItemVariant(
  item: DbQuoteItem,
  field: "color" | "product_option" | "size",
): string | null {
  const snapshot = item[field];
  if (snapshot?.trim()) return snapshot.trim();

  const fromProduct = item.products?.[field];
  return fromProduct?.trim() ? fromProduct.trim() : null;
}

export function dbQuoteItemToInput(item: DbQuoteItem): QuoteItemInput {
  const calculated = calculateQuoteLine({
    quantity: item.quantity,
    consumerPrice: Number(item.consumer_price) || 0,
    saleUnitPrice: Number(item.sale_unit_price) || 0,
    purchasePrice: Number(item.purchase_price) || 0,
    shippingCost: Number(item.shipping_cost) || 0,
  });

  return {
    product_id: item.product_id ?? "",
    supplier: item.supplier ?? "",
    purchase_source: item.purchase_source ?? "",
    fulfillment_location: parseFulfillmentLocation(item.fulfillment_location),
    category: item.category ?? "",
    brand: item.brand ?? "",
    product_name: item.product_name,
    model_name: item.model_name,
    color: resolveQuoteItemVariant(item, "color"),
    product_option: resolveQuoteItemVariant(item, "product_option"),
    size: resolveQuoteItemVariant(item, "size"),
    quantity: item.quantity,
    consumer_price: Number(item.consumer_price) || 0,
    sale_unit_price: Number(item.sale_unit_price) || 0,
    rounded_unit_price: calculated.roundedUnitPrice,
    line_total: calculated.lineTotal,
    purchase_price: Number(item.purchase_price) || 0,
    shipping_cost: Number(item.shipping_cost) || 0,
    margin: calculated.margin,
    margin_rate: calculated.marginRate,
  };
}

type SavedQuoteForPreview = {
  quote_date: string;
  sale_category: string | null;
  customer_name: string;
  business_partner: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_email: string | null;
  customer_note: string | null;
  memo: string | null;
  manager_name: string | null;
  payment_method_id: string | null;
  total_amount: number;
  card_amount: number;
  quote_items: DbQuoteItem[];
};

export function buildQuotePreviewFromSaved(
  quote: SavedQuoteForPreview,
  managerPhone: string,
) {
  const items = quote.quote_items.map(dbQuoteItemToInput);
  const calculatedTotals = calculateQuoteTotals(items);

  const data: QuoteFormData = {
    quote_date: quote.quote_date,
    sale_category: displaySaleCategory(quote.sale_category),
    customer_name: quote.customer_name,
    business_partner: quote.business_partner ?? "",
    customer_phone: quote.customer_phone ?? "",
    customer_address: quote.customer_address ?? "",
    customer_email: quote.customer_email ?? "",
    customer_note: quote.customer_note ?? "",
    memo: quote.memo ?? "",
    manager_name: quote.manager_name ?? "",
    manager_phone: managerPhone,
    payment_method_id: quote.payment_method_id ?? "",
    items,
  };

  return {
    data,
    totals: {
      totalAmount: Number(quote.total_amount) || calculatedTotals.totalAmount,
      totalMargin: calculatedTotals.totalMargin,
      cardAmount: Number(quote.card_amount) || calculatedTotals.cardAmount,
    },
  };
}
