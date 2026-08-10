import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesPeriodSummary = {
  totalAmount: number;
  marginAmount: number;
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

export async function fetchSalesPeriodSummaries(
  supabase: SupabaseClient,
  now = new Date(),
) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { monthStart, monthEnd } = getMonthDateRange(year, month);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [{ data: monthRows }, { data: yearRows }] = await Promise.all([
    supabase
      .from("sales")
      .select("total_amount, margin_amount")
      .gte("sold_at", monthStart)
      .lte("sold_at", monthEnd),
    supabase
      .from("sales")
      .select("total_amount, margin_amount")
      .gte("sold_at", yearStart)
      .lte("sold_at", yearEnd),
  ]);

  const monthSummary = sumSalesRows(monthRows);
  const yearSummary = sumSalesRows(yearRows);

  return {
    monthTotal: monthSummary.totalAmount,
    monthMargin: monthSummary.marginAmount,
    yearTotal: yearSummary.totalAmount,
    yearMargin: yearSummary.marginAmount,
  };
}
