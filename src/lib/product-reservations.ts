import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductReservationEntry = {
  quoteId: string;
  customerName: string;
  quoteDate: string;
  quantity: number;
};

export type ProductReservationsByProductId = Record<
  string,
  ProductReservationEntry[]
>;

function formatQuoteDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export async function fetchProductReservationsByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<ProductReservationsByProductId> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("quote_reservations")
    .select(
      `
      product_id,
      quantity,
      quote_id,
      quotes (
        id,
        customer_name,
        quote_date
      )
    `,
    )
    .in("product_id", uniqueIds);

  if (error) {
    if (error.message.includes("quote_reservations")) {
      return {};
    }
    throw error;
  }

  const grouped: ProductReservationsByProductId = {};

  for (const row of data ?? []) {
    const productId = row.product_id as string | null;
    if (!productId) continue;

    const quote = row.quotes as
      | {
          id?: string;
          customer_name?: string | null;
          quote_date?: string | null;
        }
      | null
      | Array<{
          id?: string;
          customer_name?: string | null;
          quote_date?: string | null;
        }>;

    const quoteRow = Array.isArray(quote) ? quote[0] : quote;
    const quoteId =
      (quoteRow?.id as string | undefined) ??
      (row.quote_id as string | undefined) ??
      "";

    const entry: ProductReservationEntry = {
      quoteId,
      customerName: quoteRow?.customer_name?.trim() || "고객 미입력",
      quoteDate: quoteRow?.quote_date
        ? formatQuoteDate(quoteRow.quote_date)
        : "-",
      quantity: Math.round(Number(row.quantity) || 0),
    };

    if (!grouped[productId]) {
      grouped[productId] = [];
    }
    grouped[productId].push(entry);
  }

  for (const productId of Object.keys(grouped)) {
    grouped[productId].sort((a, b) =>
      a.customerName.localeCompare(b.customerName, "ko"),
    );
  }

  return grouped;
}
