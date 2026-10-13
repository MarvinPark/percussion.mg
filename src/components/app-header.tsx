import AppHeaderNav from "@/components/app-header-nav";
import AppNavLink from "@/components/app-nav-link";
import AppBrandTitle from "@/components/app-brand-title";
import { getNavItems, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";

export default async function AppHeader() {
  const { profile } = await getCurrentUserProfile();
  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const navItems = getNavItems(role, permissionMap);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 shadow-[var(--shadow-header)] backdrop-blur-md after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent/30 after:to-transparent dark:border-zinc-800/80 dark:bg-zinc-900/90">
      <div className="mx-auto flex max-w-app items-center justify-between gap-3 px-4 py-3">
        <AppNavLink
          href="/dashboard"
          className="flex min-w-0 items-center hover:opacity-90"
        >
          <AppBrandTitle className="min-w-0" />
        </AppNavLink>

        <AppHeaderNav navItems={navItems} role={role} />
      </div>
    </header>
  );
}
