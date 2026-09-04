import { checkRoleChangeRpcAvailable } from "@/app/(main)/settings/users/actions";
import UsersManager from "@/components/users-manager";
import { fetchAdminUserDirectory } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

type SettingsUsersSectionProps = {
  currentUserId: string;
};

export default async function SettingsUsersSection({
  currentUserId,
}: SettingsUsersSectionProps) {
  const supabase = await createClient();
  const [
    { profiles, error: profilesError, needsMigration, orphanAuthCount, serviceRoleMissing },
    roleChangeRpcAvailable,
  ] = await Promise.all([
    fetchAdminUserDirectory(supabase),
    checkRoleChangeRpcAvailable(),
  ]);

  if (profilesError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        사용자 목록을 불러오지 못했습니다.
        <p className="mt-2 text-xs opacity-80">{profilesError}</p>
        <p className="mt-2">
          Supabase SQL Editor에서{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900">
            supabase/schema-phase7.sql
          </code>
          과{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900">
            supabase/schema-admin-settings.sql
          </code>
          을 실행해 주세요.
        </p>
      </div>
    );
  }

  return (
    <>
      {needsMigration ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          사용자 승인·이메일 기능을 쓰려면{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/schema-admin-settings.sql
          </code>
          을 Supabase에서 실행해 주세요.
        </p>
      ) : null}
      {!roleChangeRpcAvailable ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          역할 변경 DB 함수가 없습니다. Supabase SQL Editor에서{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/schema-phase7-admin-policy.sql
          </code>
          {" "}전체를 붙여넣고 Run 해 주세요.{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          가 설정되어 있으면 배포 후 임시로 역할 변경이 동작할 수 있습니다.
        </p>
      ) : null}
      {serviceRoleMissing ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Vercel 환경 변수{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          가 없어 가입만 하고 프로필이 없는 사용자를 불러오지 못할 수 있습니다.
          추가 후 Redeploy 해 주세요.
        </p>
      ) : null}
      {orphanAuthCount > 0 ? (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          프로필이 아직 없는 가입 신청 {orphanAuthCount}명이 있습니다. 직함 입력 후
          승인하면 등록됩니다.
        </p>
      ) : null}
      <UsersManager profiles={profiles as Profile[]} currentUserId={currentUserId} />
    </>
  );
}
