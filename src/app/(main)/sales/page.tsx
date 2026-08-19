import Link from "next/link";
import {
  alertError,
  btnPrimary,
  cardDashed,
  pageMain,
  pageSubtitle,
  pageTitle,
} from "@/lib/ui-classes";
import SalesAnalyticsDashboard from "@/components/sales-analytics-dashboard";
import SalesImportPanels from "@/components/sales-import-panels";
import SalesPageClient from "@/components/sales-page-client";
import { fetchPaymentMethods } from "@/lib/payment-methods";
import { fetchSaleCategoryOptions } from "@/lib/sale-category-options";
import { fetchSalesAnalyticsRows } from "@/lib/sales-analytics";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SaleWithProduct } from "@/types/sale";
import { SALE_PRODUCT_OPTION_SELECT } from "@/types/sale";

export default async function SalesPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const canManageSales = hasPermission(role, "manageSales");
  const canCreateSales = hasPermission(role, "createSales");

  const [{ data: sales, error }, { data: products }, { paymentMethods: paymentMethodsResult }, { data: staffProfiles }, analytics, { names: saleCategories }] =
    await Promise.all([
      supabase
        .from("sales")
        .select("*, products(product_name, model_name, sku)")
        .order("sold_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("products")
        .select(SALE_PRODUCT_OPTION_SELECT)
        .order("product_name", { ascending: true }),
      fetchPaymentMethods(supabase),
      supabase
        .from("profiles")
        .select("id, full_name")
        .not("full_name", "is", null)
        .order("full_name"),
      fetchSalesAnalyticsRows(supabase),
      fetchSaleCategoryOptions(supabase),
    ]);

  const paymentMethods = paymentMethodsResult;

  const staffOptions = (staffProfiles ?? [])
    .filter((profile) => profile.full_name?.trim())
    .map((profile) => ({
      id: profile.id,
      full_name: profile.full_name.trim(),
    }));

  return (
      <main className={pageMain}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={pageTitle}>매출관리</h2>
            <p className={pageSubtitle}>
              판매 기록, 월별·연도별 누적 매출과 마진을 확인합니다.
              {canManageSales ? " 행을 더블클릭하면 수정할 수 있습니다." : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales/new"
              className={btnPrimary}
            >
              + 판매 등록
            </Link>
          </div>
        </div>

        {error ? (
          <div className={alertError}>
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
            <SalesAnalyticsDashboard rows={analytics.rows} />

            <div className="mt-6">
              <SalesImportPanels
                canImport={canCreateSales}
                products={products ?? []}
                paymentMethods={paymentMethods ?? []}
              />
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
                userId={user.id}
                sales={sales as SaleWithProduct[]}
                products={products ?? []}
                paymentMethods={paymentMethods ?? []}
                saleCategories={saleCategories}
                staffOptions={staffOptions}
                canManageSales={canManageSales}
              />
            )}
          </>
        )}
      </main>
  );
}
