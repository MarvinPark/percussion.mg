import Link from "next/link";
import SalesImportPanels from "@/components/sales-import-panels";
import SalesPageClient from "@/components/sales-page-client";
import { formatKRW } from "@/lib/sales-calculator";
import { fetchSalesPeriodSummaries } from "@/lib/sales-summary";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SaleWithProduct } from "@/types/sale";

export default async function SalesPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const canManageSales = hasPermission(role, "manageSales");
  const canCreateSales = hasPermission(role, "createSales");
  const canManagePaymentMethods = hasPermission(role, "managePaymentMethods");

  const [{ data: sales, error }, { data: products }, { data: paymentMethods }, summary] =
    await Promise.all([
      supabase
        .from("sales")
        .select("*, products(product_name, model_name, sku)")
        .order("sold_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("products")
        .select(
          "id, product_name, model_name, sku, keywords, supplier, sale_price, purchase_price, stock_quantity",
        )
        .order("product_name", { ascending: true }),
      supabase
        .from("payment_methods")
        .select("id, name, fee_rate, sort_order")
        .order("sort_order", { ascending: true }),
      fetchSalesPeriodSummaries(supabase),
    ]);

  return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              매출관리
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              판매 기록, 월별·연도별 누적 매출과 마진을 확인합니다.
              {canManageSales ? " 행을 더블클릭하면 수정할 수 있습니다." : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManagePaymentMethods ? (
            <Link
              href="/sales/payment-methods"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              결제 수단 관리
            </Link>
            ) : null}
            <Link
              href="/sales/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              + 판매 등록
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">매출 데이터를 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase SQL Editor에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-sales.sql
              </code>{" "}
              파일을 실행했는지 확인해 주세요.
            </p>
          </div>
        ) : (
          <>
            <SalesImportPanels
              canImport={canCreateSales}
              products={products ?? []}
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "이번 달 매출", value: summary.monthTotal },
                { label: "이번 달 마진", value: summary.monthMargin },
                { label: "올해 누적 매출", value: summary.yearTotal },
                { label: "올해 누적 마진", value: summary.yearMargin },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatKRW(item.value)}원
                  </p>
                </div>
              ))}
            </div>

            {!sales?.length ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  아직 판매 기록이 없습니다.
                </p>
                <Link
                  href="/sales/new"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
                >
                  첫 판매 등록하기
                </Link>
              </div>
            ) : (
              <SalesPageClient
                sales={sales as SaleWithProduct[]}
                products={products ?? []}
                paymentMethods={paymentMethods ?? []}
                canManageSales={canManageSales}
              />
            )}
          </>
        )}
      </main>
  );
}
