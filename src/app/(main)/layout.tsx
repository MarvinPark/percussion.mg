import AppHeader from "@/components/app-header";
import WorkspaceTabs from "@/components/workspace-tabs";
import { getNavItems, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getWorkspaceTabItems } from "@/lib/workspace-tabs";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getCurrentUserProfile();
  const role = normalizeRole(profile?.role);
  const workspaceTabs = getWorkspaceTabItems(role);

  return (
    <div className="min-h-full bg-background">
      <AppHeader />
      {children}
      <WorkspaceTabs tabs={workspaceTabs} />
    </div>
  );
}
