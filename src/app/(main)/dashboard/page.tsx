import Link from "next/link";
import DashboardGreetingCard from "@/components/dashboard-greeting-card";
import DashboardInsightsPanel from "@/components/dashboard-insights-panel";
import DashboardLowStockAlert from "@/components/dashboard-low-stock-alert";
import SalesAnalyticsDashboard from "@/components/sales-analytics-dashboard";
import {
  cardInteractive,
  pageMain,
} from "@/lib/ui-classes";
import {
  buildCategoryShareInsights,
  fetchQuoteConversionInsights,
  fetchSalesComparisonInsights,
} from "@/lib/dashboard-insights";
import { isLowStockProduct } from "@/lib/product-stock";
import { formatKRW } from "@/lib/sales-calculator";
import { fetchSalesAnalyticsRows } from "@/lib/sales-analytics";
import { fetchSalesPeriodSummaries } from "@/lib/sales-summary";
import { getCurrentUserProfile } from "@/lib/profile";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canViewQuotes = hasPermission(role, "viewQuotes", permissionMap);
  const canViewSales = hasPermission(role, "viewSales", permissionMap);
  const canManageProducts = hasPermission(role, "manageProducts", permissionMap);

  const displayName =
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "사용자";

  const [
    { count: productCount },
    { data: lowStockCandidates },
    summary,
    { count: quoteCount },
    salesAnalytics,
    salesComparison,
    quoteConversion,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, product_name, model_name, stock_quantity, min_stock_quantity")
      .gt("min_stock_quantity", 0)
      .limit(200),
    fetchSalesPeriodSummaries(supabase),
    supabase.from("quotes").select("*", { count: "exact", head: true }),
    canViewSales ? fetchSalesAnalyticsRows(supabase) : Promise.resolve({ rows: [] }),
    canViewSales
      ? fetchSalesComparisonInsights(supabase)
      : Promise.resolve(null),
    canViewSales && canViewQuotes
      ? fetchQuoteConversionInsights(supabase)
      : Promise.resolve(null),
  ]);

  const categoryShare =
    canViewSales
      ? buildCategoryShareInsights(salesAnalytics.rows)
      : null;

  const lowStockProducts =
    lowStockCandidates?.filter((item) => isLowStockProduct(item)) ?? [];

  return (
      <main className={pageMain}>
        <DashboardGreetingCard
          displayName={displayName}
          fullName={profile?.full_name}
          jobTitle={profile?.job_title}
          email={user.email ?? ""}
        />

        {canViewSales ? (
          <div className="mt-6">
            <SalesAnalyticsDashboard rows={salesAnalytics.rows} />
          </div>
        ) : null}

        {canViewSales && salesComparison && categoryShare ? (
          <div className="mt-6">
            <DashboardInsightsPanel
              comparison={salesComparison}
              quoteConversion={quoteConversion}
              categoryShare={categoryShare}
            />
          </div>
        ) : null}

        <div className={`mt-6 grid gap-4 ${canViewQuotes ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Link href="/products" className={cardInteractive}>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              재고
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              제품 등록 · 재고 확인
            </p>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {productCount ?? 0}
              <span className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                개 제품
              </span>
            </p>
          </Link>

          <Link href="/sales" className={cardInteractive}>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              매출
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              이번 달 매출 · 마진
            </p>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatKRW(summary.monthTotal)}
              <span className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                원
              </span>
            </p>
            <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
              마진 {formatKRW(summary.monthMargin)}원 · 올해{" "}
              {formatKRW(summary.yearTotal)}원
            </p>
          </Link>

          {canViewQuotes ? (
          <Link href="/quotes" className={cardInteractive}>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              견적
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              견적서 작성 · 이력
            </p>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {quoteCount ?? 0}
              <span className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                건
              </span>
            </p>
          </Link>
          ) : null}
        </div>

        <DashboardLowStockAlert
          products={lowStockProducts}
          canManageProducts={canManageProducts}
        />
      </main>
  );
}
