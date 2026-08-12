import { dbQuoteItemToInput } from "@/lib/quote-mapper";
import type { QuoteItemInput } from "@/types/quote";

export type CopiedQuotePayload = {
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
  items: QuoteItemInput[];
};

type QuoteForCopy = {
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
  quote_items: Parameters<typeof dbQuoteItemToInput>[0][];
};

export function quoteToCopiedPayload(quote: QuoteForCopy): CopiedQuotePayload {
  return {
    sale_category: quote.sale_category,
    customer_name: quote.customer_name,
    business_partner: quote.business_partner,
    customer_phone: quote.customer_phone,
    customer_address: quote.customer_address,
    customer_email: quote.customer_email,
    customer_note: quote.customer_note,
    memo: quote.memo,
    manager_name: quote.manager_name,
    payment_method_id: quote.payment_method_id,
    items: quote.quote_items.map((item) => dbQuoteItemToInput(item)),
  };
}
