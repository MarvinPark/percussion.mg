"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "네",
  cancelLabel = "아니오",
  confirmClassName = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const yesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    yesButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="confirm-dialog-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={yesButtonRef}
            type="button"
            onClick={onConfirm}
            className={confirmClassName}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
