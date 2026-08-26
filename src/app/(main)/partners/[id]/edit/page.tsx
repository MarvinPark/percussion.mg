import Link from "next/link";
import { notFound } from "next/navigation";
import BusinessPartnerForm from "@/components/business-partner-form";
import { createPageMetadata } from "@/lib/document-titles";
import { fetchBusinessPartnerById } from "@/lib/business-partners";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("거래처 수정");

type EditPartnerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPartnerPage({ params }: EditPartnerPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canView = hasPermission(role, "viewPartners", permissionMap);
  const canManage = hasPermission(role, "managePartners", permissionMap);

  if (!canView) redirect("/dashboard");

  const { partner, error } = await fetchBusinessPartnerById(supabase, id);
  if (error || !partner) notFound();

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
          {canManage ? "거래처 수정" : "거래처 상세"}
        </h2>
        <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {partner.display_name}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <BusinessPartnerForm partner={partner} canManage={canManage} />
      </div>
    </main>
  );
}
