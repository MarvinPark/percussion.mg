import AppHeader from "@/components/app-header";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getCurrentUserProfile } from "@/lib/profile";
import { normalizeRole } from "@/lib/permissions";
import { getAvailableWorkspaceTabs } from "@/lib/workspace-tabs";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getCurrentUserProfile();
  const role = normalizeRole(profile?.role);
  const availableTabs = getAvailableWorkspaceTabs(role);

  return (
    <div className="min-h-full bg-background">
      <AppHeader />
      <WorkspaceShell availableTabs={availableTabs}>{children}</WorkspaceShell>
    </div>
  );
}
