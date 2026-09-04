import OverheadProfitSummary from "@/components/overhead-profit-summary";
import { fetchOverheadProfitInsights } from "@/lib/overhead-profit-insights";
import { createClient } from "@/lib/supabase/server";

type OverheadProfitPanelProps = {
  month: string;
  overheadTotal: number;
};

export default async function OverheadProfitPanel({
  month,
  overheadTotal,
}: OverheadProfitPanelProps) {
  const supabase = await createClient();
  const profitInsights = await fetchOverheadProfitInsights(supabase, month);

  return (
    <OverheadProfitSummary
      month={month}
      totalSales={profitInsights.totalSales}
      totalProfit={profitInsights.totalProfit}
      overheadTotal={overheadTotal}
      salesCount={profitInsights.salesCount}
      salesComparison={profitInsights.salesComparison}
      salesCountComparison={profitInsights.salesCountComparison}
      operatingProfitComparison={profitInsights.operatingProfitComparison}
    />
  );
}
