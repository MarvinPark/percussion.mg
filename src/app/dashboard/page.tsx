import Link from "next/link";
import AppHeader from "@/components/app-header";
import DashboardLowStockAlert from "@/components/dashboard-low-stock-alert";
import { formatKRW, getMonthKey, getYearKey } from "@/lib/sales-calculator";
import { getCurrentUserProfile } from "@/lib/profile";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile(supabase);

  if (!user) {
    redirect("/login");
  }

  const role = normalizeRole(profile?.role);
  const canViewQuotes = hasPermission(role, "viewQuotes");

  const displayName =
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "사용자";

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = String(now.getFullYear());

  const [{ count: productCount }, { data: allProducts }, { data: sales }, { count: quoteCount }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase
        .from("products")
        .select("id, product_name, model_name, stock_quantity, min_stock_quantity"),
      supabase.from("sales").select("sold_at, total_amount, margin_amount"),
      supabase.from("quotes").select("*", { count: "exact", head: true }),
    ]);

  const lowStockProducts =
    allProducts?.filter(
      (item) => item.stock_quantity <= item.min_stock_quantity,
    ) ?? [];

  let monthSales = 0;
  let monthMargin = 0;
  let yearSales = 0;

  for (const sale of sales ?? []) {
    if (getMonthKey(sale.sold_at) === currentMonth) {
      monthSales += sale.total_amount;
      monthMargin += sale.margin_amount;
    }
    if (getYearKey(sale.sold_at) === currentYear) {
      yearSales += sale.total_amount;
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            오늘도 화이팅! {displayName}님
          </h2>
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {user.email}
          </p>
        </div>

        <div className={`mt-6 grid gap-4 ${canViewQuotes ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Link
            href="/products"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
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

          <Link
            href="/sales"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              매출
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              이번 달 매출 · 마진
            </p>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatKRW(monthSales)}
              <span className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                원
              </span>
            </p>
            <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
              마진 {formatKRW(monthMargin)}원 · 올해 {formatKRW(yearSales)}원
            </p>
          </Link>

          {canViewQuotes ? (
          <Link
            href="/quotes"
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
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

        <DashboardLowStockAlert products={lowStockProducts} />
      </main>
    </div>
  );
}
