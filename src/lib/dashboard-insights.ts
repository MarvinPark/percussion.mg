import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateSalesRanking,
  getCurrentMonthRange,
  type SalesAnalyticsRow,
  type SalesRankEntry,
} from "@/lib/sales-analytics";
import type { SalesPeriodSummary } from "@/lib/sales-summary";

function getMonthDateRange(year: number, month: number) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
  return { monthStart, monthEnd, year, month };
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getComparableMtdEnd(year: number, month: number, asOf: Date): string {
  const refYear = asOf.getFullYear();
  const refMonth = asOf.getMonth() + 1;
  const refDay = asOf.getDate();

  if (year === refYear && month === refMonth) {
    return formatDateISO(asOf);
  }

  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(refDay, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function fetchMonthSummary(
  supabase: SupabaseClient,
  year: number,
  month: number,
  asOf: Date = new Date(),
): Promise<SalesPeriodSummary> {
  const { monthStart } = getMonthDateRange(year, month);
  const monthEnd = getComparableMtdEnd(year, month, asOf);
  const { data } = await supabase
    .from("sales")
    .select("total_amount, margin_amount")
    .gte("sold_at", monthStart)
    .lte("sold_at", monthEnd);

  let totalAmount = 0;
  let marginAmount = 0;
  for (const row of data ?? []) {
    totalAmount += Number(row.total_amount) || 0;
    marginAmount += Number(row.margin_amount) || 0;
  }

  return { totalAmount, marginAmount };
}

export type SalesComparisonMetric = {
  label: string;
  current: number;
  previousMonth: number;
  sameMonthLastYear: number;
  changeVsPreviousMonth: number | null;
  changeVsSameMonthLastYear: number | null;
};

export type SalesComparisonInsights = {
  monthLabel: string;
  sales: SalesComparisonMetric;
  margin: SalesComparisonMetric;
};

export type QuoteConversionInsights = {
  monthLabel: string;
  quoteCount: number;
  convertedCount: number;
  conversionRate: number | null;
};

export type CategoryShareEntry = SalesRankEntry & {
  sharePercent: number;
};

export type CategoryShareInsights = {
  monthLabel: string;
  entries: CategoryShareEntry[];
  totalSales: number;
};

function calcChangePercent(current: number, base: number): number | null {
  if (base === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - base) / base) * 100;
}

function buildComparisonMetric(
  label: string,
  current: number,
  previousMonth: number,
  sameMonthLastYear: number,
): SalesComparisonMetric {
  return {
    label,
    current,
    previousMonth,
    sameMonthLastYear,
    changeVsPreviousMonth: calcChangePercent(current, previousMonth),
    changeVsSameMonthLastYear: calcChangePercent(current, sameMonthLastYear),
  };
}

export async function fetchSalesComparisonInsights(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<SalesComparisonInsights> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prev = shiftMonth(year, month, -1);
  const yoy = { year: year - 1, month };

  const [current, previousMonth, sameMonthLastYear] = await Promise.all([
    fetchMonthSummary(supabase, year, month, now),
    fetchMonthSummary(supabase, prev.year, prev.month, now),
    fetchMonthSummary(supabase, yoy.year, yoy.month, now),
  ]);

  return {
    monthLabel: `${year}년 ${month}월`,
    sales: buildComparisonMetric(
      "매출",
      current.totalAmount,
      previousMonth.totalAmount,
      sameMonthLastYear.totalAmount,
    ),
    margin: buildComparisonMetric(
      "마진",
      current.marginAmount,
      previousMonth.marginAmount,
      sameMonthLastYear.marginAmount,
    ),
  };
}

export async function fetchQuoteConversionInsights(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<QuoteConversionInsights> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { monthStart, monthEnd } = getMonthDateRange(year, month);

  const { data: monthQuotes } = await supabase
    .from("quotes")
    .select("id")
    .gte("quote_date", monthStart)
    .lte("quote_date", monthEnd);

  const quoteIds = (monthQuotes ?? []).map((row) => row.id);
  const quoteCount = quoteIds.length;

  if (quoteCount === 0) {
    return {
      monthLabel: `${year}년 ${month}월`,
      quoteCount: 0,
      convertedCount: 0,
      conversionRate: null,
    };
  }

  const { data: linkedSales } = await supabase
    .from("sales")
    .select("quote_id")
    .in("quote_id", quoteIds);

  const convertedCount = new Set(
    (linkedSales ?? [])
      .map((row) => row.quote_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  ).size;

  return {
    monthLabel: `${year}년 ${month}월`,
    quoteCount,
    convertedCount,
    conversionRate: quoteCount > 0 ? (convertedCount / quoteCount) * 100 : null,
  };
}

export function buildCategoryShareInsights(
  rows: SalesAnalyticsRow[],
  now = new Date(),
): CategoryShareInsights {
  const { start, end } = getCurrentMonthRange(now);
  const [y, m] = start.split("-");
  const monthLabel = `${y}년 ${Number(m)}월`;

  const entries = aggregateSalesRanking(rows, "sale_category", start, end, 20);
  const totalSales = entries.reduce((sum, entry) => sum + entry.sales, 0);

  const withShare: CategoryShareEntry[] = entries.map((entry) => ({
    ...entry,
    sharePercent:
      totalSales > 0 ? Math.round((entry.sales / totalSales) * 1000) / 10 : 0,
  }));

  return {
    monthLabel,
    entries: withShare,
    totalSales,
  };
}
