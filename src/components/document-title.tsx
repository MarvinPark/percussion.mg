"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { resolveDocumentTitle } from "@/lib/document-titles";

export default function DocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = resolveDocumentTitle(pathname);
  }, [pathname]);

  return null;
}
