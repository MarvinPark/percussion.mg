import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchOverheadTotalForMonth,
  shiftAccrualMonth,
} from "@/lib/overhead-expenses";
import { fetchSalesSummaryForMonth } from "@/lib/sales-summary";

export type OverheadMetricComparison = {
  changeVsPreviousMonth: number | null;
  changeVsSameMonthLastYear: number | null;
};

export type OverheadProfitInsights = {
  totalSales: number;
  totalProfit: number;
  salesCount: number;
  salesComparison: OverheadMetricComparison;
  salesCountComparison: OverheadMetricComparison;
  operatingProfitComparison: OverheadMetricComparison;
};

function calcChangePercent(current: number, base: number): number | null {
  if (base === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - base) / base) * 100;
}

function buildComparison(
  current: number,
  previousMonth: number,
  sameMonthLastYear: number,
): OverheadMetricComparison {
  return {
    changeVsPreviousMonth: calcChangePercent(current, previousMonth),
    changeVsSameMonthLastYear: calcChangePercent(current, sameMonthLastYear),
  };
}

export async function fetchOverheadProfitInsights(
  supabase: SupabaseClient,
  month: string,
): Promise<OverheadProfitInsights> {
  const previousMonth = shiftAccrualMonth(month, -1);
  const sameMonthLastYear = shiftAccrualMonth(month, -12);

  const [
    currentSales,
    previousSales,
    yoySales,
    currentOverhead,
    previousOverhead,
    yoyOverhead,
  ] = await Promise.all([
    fetchSalesSummaryForMonth(supabase, month),
    fetchSalesSummaryForMonth(supabase, previousMonth),
    fetchSalesSummaryForMonth(supabase, sameMonthLastYear),
    fetchOverheadTotalForMonth(supabase, month),
    fetchOverheadTotalForMonth(supabase, previousMonth),
    fetchOverheadTotalForMonth(supabase, sameMonthLastYear),
  ]);

  const operatingProfit = currentSales.marginAmount - currentOverhead;
  const previousOperatingProfit = previousSales.marginAmount - previousOverhead;
  const yoyOperatingProfit = yoySales.marginAmount - yoyOverhead;

  return {
    totalSales: currentSales.totalAmount,
    totalProfit: currentSales.marginAmount,
    salesCount: currentSales.salesCount,
    salesComparison: buildComparison(
      currentSales.totalAmount,
      previousSales.totalAmount,
      yoySales.totalAmount,
    ),
    salesCountComparison: buildComparison(
      currentSales.salesCount,
      previousSales.salesCount,
      yoySales.salesCount,
    ),
    operatingProfitComparison: buildComparison(
      operatingProfit,
      previousOperatingProfit,
      yoyOperatingProfit,
    ),
  };
}
