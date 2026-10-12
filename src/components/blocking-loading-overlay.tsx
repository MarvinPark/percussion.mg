"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BlockingLoadingOverlayProps = {
  open: boolean;
  message?: string;
};

export default function BlockingLoadingOverlay({
  open,
  message = "처리 중...",
}: BlockingLoadingOverlayProps) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="mx-4 max-w-sm rounded-xl border border-zinc-200 bg-white px-6 py-5 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div
          className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-400"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {message}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          완료될 때까지 다른 작업을 할 수 없습니다.
        </p>
      </div>
    </div>,
    document.body,
  );
}
