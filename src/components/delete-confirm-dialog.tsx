"use client";

import { useEffect, useRef } from "react";

type DeleteConfirmDialogProps = {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const yesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    yesButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="delete-confirm-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          정말로 삭제하겠습니까?
        </h3>
        {count > 1 ? (
          <p className="mt-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
            선택한 {count}개 제품이 삭제됩니다.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            아니오
          </button>
          <button
            ref={yesButtonRef}
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-normal text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
          >
            네
          </button>
        </div>
      </div>
    </div>
  );
}
