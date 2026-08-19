import WorkspacePageBridge from "@/components/workspace/workspace-page-bridge";

export default function QuotesWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspacePageBridge tabId="quotes">{children}</WorkspacePageBridge>;
}
