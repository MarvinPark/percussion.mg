import Link from "next/link";
import DashboardLowStockAlert from "@/components/dashboard-low-stock-alert";
import {
  card,
  cardInteractive,
  pageMain,
} from "@/lib/ui-classes";
import { isLowStockProduct } from "@/lib/product-stock";
import { formatKRW } from "@/lib/sales-calculator";
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
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, product_name, model_name, stock_quantity, min_stock_quantity")
      .gt("min_stock_quantity", 0)
      .limit(200),
    fetchSalesPeriodSummaries(supabase),
    supabase.from("quotes").select("*", { count: "exact", head: true }),
  ]);

  const lowStockProducts =
    lowStockCandidates?.filter((item) => isLowStockProduct(item)) ?? [];

  return (
      <main className={pageMain}>
        <div className={`${card} border-t-2 border-t-accent/40`}>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            오늘도 화이팅! {displayName}님
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {user.email}
          </p>
        </div>

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
