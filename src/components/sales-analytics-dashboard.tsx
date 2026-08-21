"use client";

import SalesAnalyticsRankSection from "@/components/sales-analytics-rank-section";
import type { SalesAnalyticsRow } from "@/lib/sales-analytics";

type SalesAnalyticsDashboardProps = {
  rows: SalesAnalyticsRow[];
};

/** @deprecated Rank charts only — trend panels live on the dashboard page. */
export default function SalesAnalyticsDashboard({
  rows,
}: SalesAnalyticsDashboardProps) {
  return <SalesAnalyticsRankSection rows={rows} />;
}
