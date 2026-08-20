import { logout } from "@/app/login/actions";
import { createPageMetadata } from "@/lib/document-titles";
import { createClient } from "@/lib/supabase/server";
import { needsAdminApproval } from "@/types/profile";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("승인 대기");

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, job_title, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!needsAdminApproval(profile)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          관리자 승인 대기
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {profile?.full_name?.trim() || "계정"}님, 등록해 주셔서 감사합니다.
          <br />
          <span className="font-semibold">인증 후 사용 가능합니다.</span>
          <br />
          관리자 승인 후 다시 로그인해 주세요.
        </p>
        {profile?.job_title?.trim() ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            직함: {profile.job_title}
          </p>
        ) : null}
        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
