import AppHeader from "@/components/app-header";
import MyPageContent from "@/components/my-page-content";
import { normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/types/profile";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  if (!isProfileComplete(profile)) {
    redirect("/profile/setup");
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          마이페이지
        </h2>

        <MyPageContent
          fullName={profile!.full_name}
          jobTitle={profile!.job_title!.trim()}
          phone={profile!.phone}
          email={user.email ?? ""}
          role={normalizeRole(profile!.role)}
        />
      </main>
    </div>
  );
}
