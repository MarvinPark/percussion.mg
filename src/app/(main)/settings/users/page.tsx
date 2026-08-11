import UsersManager from "@/components/users-manager";
import { getCurrentUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";
import { redirect } from "next/navigation";

export default async function UsersSettingsPage() {
  const supabase = await createClient();
  const { user } = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, job_title, phone, role, created_at, updated_at")
    .order("full_name", { ascending: true });

  return (
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24">
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          사용자 관리
        </h2>
        <p className="mb-6 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          직원별 역할을 설정합니다. 관리자는 모든 기능을, 매니저는 사용자
          관리를 제외한 기능을, 직원은 재고 조회와 판매 등록만 할 수 있습니다.
        </p>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            사용자 목록을 불러오지 못했습니다.{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900">
              supabase/schema-phase7.sql
            </code>
            을 실행했는지 확인해 주세요.
          </div>
        ) : (
          <UsersManager
            profiles={(profiles ?? []) as Profile[]}
            currentUserId={user.id}
          />
        )}
      </main>
  );
}
