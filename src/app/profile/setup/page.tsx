import { redirect } from "next/navigation";
import ProfileSetupForm from "./profile-setup-form";
import { createPageMetadata } from "@/lib/document-titles";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthProfile } from "@/lib/profile-auth";
import {
  canUseApp,
  needsAdminApproval,
  normalizeAccountStatus,
} from "@/types/profile";

export const metadata = createPageMetadata("프로필 설정");

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await fetchAuthProfile(supabase, user.id);

  const accountStatus = normalizeAccountStatus(profile?.account_status);

  if (needsAdminApproval(profile)) {
    redirect("/profile/pending-approval");
  }

  if (canUseApp(profile)) {
    redirect("/dashboard");
  }

  const isInvitedFlow = accountStatus === "pending_setup";

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {isInvitedFlow ? "계정 정보 입력" : "개인정보 등록"}
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {isInvitedFlow
              ? "이름과 비밀번호를 입력한 뒤 관리자 승인을 기다려 주세요."
              : "이름, 직함, 전화번호를 등록해야 시스템을 사용할 수 있습니다."}
          </p>
        </div>

        <ProfileSetupForm
          mode={isInvitedFlow ? "invited" : "standard"}
          defaultFullName={
            profile?.full_name?.trim() && profile.full_name !== "미등록"
              ? profile.full_name
              : typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : ""
          }
          defaultJobTitle={profile?.job_title?.trim() ?? ""}
          defaultPhone={
            profile?.phone?.trim() && profile.phone !== "미등록"
              ? profile.phone
              : typeof user.user_metadata?.phone === "string"
                ? user.user_metadata.phone
                : ""
          }
        />
      </div>
    </div>
  );
}
