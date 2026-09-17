import CompanyDocumentsPageClient from "@/components/company-documents-page-client";
import { createPageMetadata } from "@/lib/document-titles";
import { fetchCompanyDocuments } from "@/lib/company-documents";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = createPageMetadata("문서");

export default async function DocumentsPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canView = hasPermission(role, "viewDocuments", permissionMap);
  const canManage = hasPermission(role, "manageDocuments", permissionMap);

  if (!canView) redirect("/dashboard");

  const supabase = await createClient();
  const { documents, error } = await fetchCompanyDocuments(supabase);

  return (
    <main className={pageMain}>
      <div className="mb-6">
        <h2 className={pageTitle}>문서</h2>
        <p className={pageSubtitle}>
          사업자등록증, 통장사본 등 자주 쓰는 사본 파일을 보관합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
          <CompanyDocumentsPageClient
            userId={user.id}
            documents={documents}
            canManage={canManage}
            schemaError={error}
          />
        </Suspense>
      </div>
    </main>
  );
}
