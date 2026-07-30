import { redirect } from "next/navigation";
import ProfileSetupForm from "./profile-setup-form";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/types/profile";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, job_title, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            개인정보 등록
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            이름, 직함, 전화번호를 등록해야 시스템을 사용할 수 있습니다.
          </p>
        </div>

        <ProfileSetupForm
          defaultFullName={
            profile?.full_name?.trim() ||
            (typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : "")
          }
          defaultJobTitle={
            profile?.job_title?.trim() ||
            (typeof user.user_metadata?.job_title === "string"
              ? user.user_metadata.job_title
              : "")
          }
          defaultPhone={
            profile?.phone?.trim() ||
            (typeof user.user_metadata?.phone === "string"
              ? user.user_metadata.phone
              : "")
          }
        />
      </div>
    </div>
  );
}
