"use client";

import { usePathname } from "next/navigation";
import AppBrandFooter from "@/components/app-brand-footer";
import { isWorkspacePath } from "@/lib/workspace-tabs";

export default function ConditionalBrandFooter() {
  const pathname = usePathname();

  if (isWorkspacePath(pathname)) {
    return null;
  }

  return <AppBrandFooter />;
}
