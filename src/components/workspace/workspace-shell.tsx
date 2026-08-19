"use client";

import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import WorkspacePanelHost from "@/components/workspace/workspace-panel-host";
import WorkspaceTabBar from "@/components/workspace/workspace-tab-bar";
import type { WorkspaceTabMeta } from "@/lib/workspace-tabs";

type WorkspaceShellProps = {
  availableTabs: WorkspaceTabMeta[];
  children: React.ReactNode;
};

export default function WorkspaceShell({
  availableTabs,
  children,
}: WorkspaceShellProps) {
  return (
    <WorkspaceProvider availableTabs={availableTabs}>
      <WorkspaceTabBar />
      <WorkspacePanelHost />
      {children}
    </WorkspaceProvider>
  );
}
