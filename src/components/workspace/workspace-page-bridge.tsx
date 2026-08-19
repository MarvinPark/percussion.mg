"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { WorkspaceTabId } from "@/lib/workspace-tabs";

type WorkspacePageBridgeProps = {
  tabId: WorkspaceTabId;
  children: React.ReactNode;
};

export default function WorkspacePageBridge({
  tabId,
  children,
}: WorkspacePageBridgeProps) {
  const { setPanelContent } = useWorkspace();

  useEffect(() => {
    setPanelContent(tabId, children);
  }, [children, setPanelContent, tabId]);

  return null;
}
