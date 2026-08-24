"use client";

import LeaveConfirmDialog from "@/components/leave-confirm-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function useUnsavedChangesGuard(enabled: boolean) {
  const router = useRouter();
  const enabledRef = useRef(enabled);
  const allowNavigationRef = useRef(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  enabledRef.current = enabled;

  const requestLeave = useCallback((action: () => void) => {
    pendingNavigationRef.current = action;
    setDialogOpen(true);
  }, []);

  const confirmLeave = useCallback(() => {
    allowNavigationRef.current = true;
    setDialogOpen(false);
    const action = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    action?.();
  }, []);

  const cancelLeave = useCallback(() => {
    setDialogOpen(false);
    pendingNavigationRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current || !enabledRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    function handleClick(event: MouseEvent) {
      if (allowNavigationRef.current || !enabledRef.current) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      requestLeave(() => {
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [enabled, requestLeave, router]);

  useEffect(() => {
    if (!enabled) return;

    window.history.pushState({ pcUnsavedGuard: true }, "", window.location.href);

    function handlePopState() {
      if (allowNavigationRef.current || !enabledRef.current) return;

      window.history.pushState({ pcUnsavedGuard: true }, "", window.location.href);
      requestLeave(() => {
        window.history.go(-2);
      });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled, requestLeave]);

  const dialog = dialogOpen ? (
    <LeaveConfirmDialog onConfirm={confirmLeave} onCancel={cancelLeave} />
  ) : null;

  return { dialog };
}
