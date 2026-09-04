import { Suspense } from "react";
import { SettingsCompactSkeleton, SettingsSectionSkeleton } from "@/components/settings-section-skeleton";
import SettingsCatalogSections from "@/app/(main)/settings/users/settings-catalog-sections";
import SettingsRolePermissionsSection from "@/app/(main)/settings/users/settings-role-permissions-section";
import SettingsUsersSection from "@/app/(main)/settings/users/settings-users-section";
import { createPageMetadata } from "@/lib/document-titles";
import { getCurrentUserProfile } from "@/lib/profile";
import { normalizeRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("설정");

const sectionClass =
  "min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900";

export default async function AdminSettingsPage() {
  const { user, profile } = await getCurrentUserProfile();
  const isAdmin = normalizeRole(profile?.role) === "admin";

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-w-0 max-w-app px-3 py-8 pb-24 sm:px-4">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        설정
      </h2>
      <p className="mb-8 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        사용자, 역할별 접근 권한, 결제 수단, 견적 구분{isAdmin ? ", 판관비 항목" : ""}을 관리합니다.
      </p>

      <div className="space-y-8">
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
          <section id="role-permissions" className={sectionClass}>
            <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              1. 역할별 접근 권한
            </h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              관리자·매니저·직원 등급별로 메뉴 접근과 등록·수정 권한을 설정합니다.
            </p>
            <Suspense fallback={<SettingsSectionSkeleton rows={6} />}>
              <SettingsRolePermissionsSection />
            </Suspense>
          </section>

          <section id="users" className={sectionClass}>
            <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              2. 사용자 관리
            </h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              직원 초대, 역할·직함 설정, 승인 처리를 합니다.
            </p>
            <Suspense fallback={<SettingsSectionSkeleton rows={8} />}>
              <SettingsUsersSection currentUserId={user.id} />
            </Suspense>
          </section>
        </div>

        <Suspense fallback={<SettingsCompactSkeleton />}>
          <SettingsCatalogSections isAdmin={isAdmin} />
        </Suspense>
      </div>
    </main>
  );
}
