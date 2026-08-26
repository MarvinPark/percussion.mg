import Link from "next/link";
import BusinessPartnerForm from "@/components/business-partner-form";
import { createPageMetadata } from "@/lib/document-titles";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("거래처 등록");

export default async function NewPartnerPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  if (!hasPermission(role, "managePartners", permissionMap)) {
    redirect("/partners");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/partners"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          ← 거래처 목록
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          거래처 등록
        </h2>
        <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          기본 연락처와 세금계산서 정보를 입력합니다. B2C도 등록할 수 있습니다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <BusinessPartnerForm />
      </div>
    </main>
  );
}
