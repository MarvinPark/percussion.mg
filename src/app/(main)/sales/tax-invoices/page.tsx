import Link from "next/link";
import TaxInvoicesList from "@/components/tax-invoices-list";
import PopbillStatusPanel from "@/components/popbill-status-panel";
import { createPageMetadata } from "@/lib/document-titles";
import { fetchTaxInvoiceIssues } from "@/lib/tax-invoice-issues";
import { isPopbillConfigured } from "@/lib/popbill/env";
import { getPopbillIssueStatus } from "@/lib/popbill/readiness";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import {
  alertError,
  pageMain,
  pageSubtitle,
  pageTitle,
} from "@/lib/ui-classes";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("세금계산서 발행");

export default async function TaxInvoicesPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canViewSales = hasPermission(role, "viewSales", permissionMap);
  const canManageSales = hasPermission(role, "manageSales", permissionMap);

  if (!canViewSales) redirect("/dashboard");

  let popbillStatus = null;
  if (canManageSales && isPopbillConfigured()) {
    try {
      popbillStatus = await getPopbillIssueStatus();
    } catch {
      popbillStatus = null;
    }
  }

  const tableProbe = await supabase
    .from("tax_invoice_issues")
    .select("id", { count: "exact", head: true });

  const needsMigration = Boolean(tableProbe.error);

  const { issues, error } = needsMigration
    ? { issues: [], error: null }
    : await fetchTaxInvoiceIssues(supabase);

  return (
    <main className={pageMain}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={pageTitle}>세금계산서 발행</h2>
          <p className={pageSubtitle}>
            매출에서 발행한 세금계산서 내역을 확인합니다.
          </p>
        </div>
        <Link
          href="/sales"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          매출 목록
        </Link>
      </div>

      {popbillStatus ? <PopbillStatusPanel status={popbillStatus} /> : null}

      {needsMigration ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">세금계산서 발행 테이블이 아직 없습니다.</p>
          <p className="mt-1">
            Supabase SQL Editor에서{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              supabase/schema-tax-invoices.sql
            </code>
            {" "}을 실행해 주세요.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className={alertError}>발행 내역을 불러오지 못했습니다.</div>
      ) : (
        <TaxInvoicesList issues={issues} />
      )}
    </main>
  );
}
