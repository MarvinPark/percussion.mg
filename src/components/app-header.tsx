import Link from "next/link";
import AppHeaderNav from "@/components/app-header-nav";
import { getNavItems, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";

export default async function AppHeader() {
  const { profile } = await getCurrentUserProfile();
  const role = normalizeRole(profile?.role);
  const navItems = getNavItems(role);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="min-w-0 shrink hover:opacity-80">
          <p className="truncate text-xs font-semibold tracking-widest text-zinc-600 dark:text-zinc-400">
            PERCUSSIONCENTER
          </p>
          <h1 className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-100">
            관리시스템
          </h1>
        </Link>

        <AppHeaderNav navItems={navItems} role={role} />
      </div>
    </header>
  );
}
