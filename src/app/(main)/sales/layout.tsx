import WorkspacePageBridge from "@/components/workspace/workspace-page-bridge";

export default function SalesWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspacePageBridge tabId="sales">{children}</WorkspacePageBridge>;
}
