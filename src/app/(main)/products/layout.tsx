import WorkspacePageBridge from "@/components/workspace/workspace-page-bridge";

export default function ProductsWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspacePageBridge tabId="products">{children}</WorkspacePageBridge>
  );
}
