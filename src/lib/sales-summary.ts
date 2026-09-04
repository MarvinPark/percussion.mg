import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesPeriodSummary = {
  totalAmount: number;
  marginAmount: number;
};

export type SalesMonthSummary = SalesPeriodSummary & {
  salesCount: number;
};

function getMonthDateRange(year: number, month: number) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
  return { monthStart, monthEnd };
}

function sumSalesRows(
  rows: { total_amount: number; margin_amount: number }[] | null,
): SalesPeriodSummary {
  let totalAmount = 0;
  let marginAmount = 0;

  for (const row of rows ?? []) {
    totalAmount += Number(row.total_amount) || 0;
    marginAmount += Number(row.margin_amount) || 0;
  }

  return { totalAmount, marginAmount };
}

function parseSalesAggregateRow(
  row: Record<string, unknown> | undefined,
): SalesMonthSummary {
  if (!row) {
    return { totalAmount: 0, marginAmount: 0, salesCount: 0 };
  }

  const sumField = row.sum;
  if (sumField && typeof sumField === "object") {
    const nested = sumField as Record<string, unknown>;
    return {
      totalAmount: Number(nested.total_amount) || 0,
      marginAmount: Number(nested.margin_amount) || 0,
      salesCount: Number(row.count) || 0,
    };
  }

  return {
    totalAmount: Number(row.total_amount ?? row.sum) || 0,
    marginAmount: Number(row.margin_amount) || 0,
    salesCount: Number(row.count) || 0,
  };
}

async function fetchSalesSummaryFallback(
  supabase: SupabaseClient,
  monthStart: string,
  monthEnd: string,
): Promise<SalesMonthSummary> {
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("sales")
      .select("total_amount, margin_amount")
      .gte("sold_at", monthStart)
      .lte("sold_at", monthEnd),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .gte("sold_at", monthStart)
      .lte("sold_at", monthEnd),
  ]);

  return {
    ...sumSalesRows(data),
    salesCount: count ?? 0,
  };
}

async function fetchSalesSummaryAggregated(
  supabase: SupabaseClient,
  monthStart: string,
  monthEnd: string,
): Promise<SalesMonthSummary> {
  const { data, error } = await supabase
    .from("sales")
    .select("total_amount.sum(), margin_amount.sum(), id.count()")
    .gte("sold_at", monthStart)
    .lte("sold_at", monthEnd);

  if (error || !data?.length) {
    return fetchSalesSummaryFallback(supabase, monthStart, monthEnd);
  }

  return parseSalesAggregateRow(data[0] as Record<string, unknown>);
}

export async function fetchSalesSummaryForMonth(
  supabase: SupabaseClient,
  month: string,
): Promise<SalesMonthSummary> {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return { totalAmount: 0, marginAmount: 0, salesCount: 0 };
  }

  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  const { monthStart, monthEnd } = getMonthDateRange(year, monthNum);

  return fetchSalesSummaryAggregated(supabase, monthStart, monthEnd);
}

export async function fetchSalesPeriodSummaries(
  supabase: SupabaseClient,
  now = new Date(),
) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { monthStart, monthEnd } = getMonthDateRange(year, month);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [monthSummary, yearSummary] = await Promise.all([
    fetchSalesSummaryAggregated(supabase, monthStart, monthEnd),
    fetchSalesSummaryAggregated(supabase, yearStart, yearEnd),
  ]);

  return {
    monthTotal: monthSummary.totalAmount,
    monthMargin: monthSummary.marginAmount,
    yearTotal: yearSummary.totalAmount,
    yearMargin: yearSummary.marginAmount,
  };
}
