import type { SupabaseClient } from "@supabase/supabase-js";

export type QuoteReservationRow = {
  id: string;
  quoteId: string;
  quoteDate: string;
  customerName: string;
  managerName: string | null;
  productId: string;
  productName: string;
  modelName: string;
  sku: string;
  quantity: number;
  reservedAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function fetchAllQuoteReservations(
  supabase: SupabaseClient,
): Promise<{ rows: QuoteReservationRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("quote_reservations")
    .select(
      `
      id,
      quantity,
      created_at,
      quote_id,
      product_id,
      quotes (
        quote_date,
        customer_name,
        manager_name
      ),
      products (
        product_name,
        model_name,
        sku
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    if (error.message.includes("quote_reservations")) {
      return {
        rows: [],
        error:
          "quote_reservations 테이블이 없습니다. supabase/schema-quote-reservations.sql을 실행해 주세요.",
      };
    }
    return { rows: [], error: error.message };
  }

  const rows: QuoteReservationRow[] = [];

  for (const row of data ?? []) {
    const quote = row.quotes as
      | {
          quote_date?: string | null;
          customer_name?: string | null;
          manager_name?: string | null;
        }
      | null
      | Array<{
          quote_date?: string | null;
          customer_name?: string | null;
          manager_name?: string | null;
        }>;

    const product = row.products as
      | {
          product_name?: string | null;
          model_name?: string | null;
          sku?: string | null;
        }
      | null
      | Array<{
          product_name?: string | null;
          model_name?: string | null;
          sku?: string | null;
        }>;

    const quoteRow = Array.isArray(quote) ? quote[0] : quote;
    const productRow = Array.isArray(product) ? product[0] : product;

    rows.push({
      id: row.id as string,
      quoteId: row.quote_id as string,
      quoteDate: quoteRow?.quote_date
        ? formatDate(quoteRow.quote_date)
        : "-",
      customerName: quoteRow?.customer_name?.trim() || "고객 미입력",
      managerName: quoteRow?.manager_name?.trim() || null,
      productId: row.product_id as string,
      productName: productRow?.product_name?.trim() || "-",
      modelName: productRow?.model_name?.trim() || "-",
      sku: productRow?.sku?.trim() || "-",
      quantity: Math.round(Number(row.quantity) || 0),
      reservedAt: row.created_at
        ? formatDateTime(row.created_at as string)
        : "-",
    });
  }

  return { rows, error: null };
}

export function summarizeQuoteReservations(rows: QuoteReservationRow[]) {
  const quoteIds = new Set(rows.map((row) => row.quoteId));
  const productIds = new Set(rows.map((row) => row.productId));
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

  return {
    lineCount: rows.length,
    quoteCount: quoteIds.size,
    productCount: productIds.size,
    totalQuantity,
  };
}

export function filterQuoteReservations(
  rows: QuoteReservationRow[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.customerName,
      row.managerName ?? "",
      row.productName,
      row.modelName,
      row.sku,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
