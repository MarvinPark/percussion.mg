import { redirect } from "next/navigation";
import ProfileSetupForm from "./profile-setup-form";
import { createClient } from "@/lib/supabase/server";

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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
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
            이름과 전화번호를 등록해야 시스템을 사용할 수 있습니다.
          </p>
        </div>

        <ProfileSetupForm
          defaultFullName={
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : ""
          }
          defaultPhone={
            typeof user.user_metadata?.phone === "string"
              ? user.user_metadata.phone
              : ""
          }
        />
      </div>
    </div>
  );
}
