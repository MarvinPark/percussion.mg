import Link from "next/link";
import { Suspense } from "react";
import PartnersPageClient from "@/components/partners-page-client";
import PartnersExcelImport from "@/components/partners-excel-import";
import { createPageMetadata } from "@/lib/document-titles";
import { fetchBusinessPartners } from "@/lib/business-partners";
import {
  btnPrimary,
  pageMain,
  pageSubtitle,
  pageTitle,
} from "@/lib/ui-classes";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("거래처");

type PartnersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canView = hasPermission(role, "viewPartners", permissionMap);
  const canManage = hasPermission(role, "managePartners", permissionMap);

  if (!canView) redirect("/dashboard");

  const tableProbe = await supabase
    .from("business_partners")
    .select("id", { count: "exact", head: true });

  const needsMigration = Boolean(tableProbe.error);

  const columnProbe = needsMigration
    ? { error: null }
    : await supabase
        .from("business_partners")
        .select("invoice_contact_name")
        .limit(1);

  const needsColumnMigration = Boolean(!needsMigration && columnProbe.error);

  const memoProbe =
    needsMigration || needsColumnMigration
      ? { error: null }
      : await supabase.from("business_partners").select("memo").limit(1);

  const needsMemoColumnMigration = Boolean(
    !needsMigration && !needsColumnMigration && memoProbe.error,
  );

  const { partners, error } = needsMigration
    ? { partners: [], error: null }
    : await fetchBusinessPartners(supabase, { search });

  return (
    <main className={pageMain}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={pageTitle}>거래처</h2>
          <p className={pageSubtitle}>
            세금계산서 공급받는자 정보를 관리합니다.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <PartnersExcelImport
              disabled={
                needsMigration || needsColumnMigration || needsMemoColumnMigration
              }
            />
            <Link href="/partners/new" className={btnPrimary}>
              + 거래처 등록
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          거래처 목록을 불러오지 못했습니다.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
            <PartnersPageClient
              userId={user.id}
              partners={partners}
            canManage={canManage}
            initialSearch={search}
            needsMigration={needsMigration}
            needsColumnMigration={needsColumnMigration}
            needsMemoColumnMigration={needsMemoColumnMigration}
          />
          </Suspense>
        </div>
      )}
    </main>
  );
}
