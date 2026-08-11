"use client";

import { useEffect, useRef, useState } from "react";
import SalesSellerFilter from "@/components/sales-seller-filter";

type StaffOption = {
  id: string;
  full_name: string;
};

type QuoteConvertDialogProps = {
  title: string;
  description?: string;
  staffOptions: StaffOption[];
  defaultSellerName: string;
  showSellerPicker: boolean;
  isPending?: boolean;
  onConfirm: (seller: { userId: string; name: string }) => void;
  onCancel: () => void;
};

export default function QuoteConvertDialog({
  title,
  description,
  staffOptions,
  defaultSellerName,
  showSellerPicker,
  isPending = false,
  onConfirm,
  onCancel,
}: QuoteConvertDialogProps) {
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const sellerNames = staffOptions.map((staff) => staff.full_name);
  const [selectedSellerName, setSelectedSellerName] = useState(defaultSellerName);

  useEffect(() => {
    yesButtonRef.current?.focus();
  }, []);

  function handleConfirm() {
    const selectedStaff =
      staffOptions.find((staff) => staff.full_name === selectedSellerName) ??
      staffOptions.find((staff) => staff.full_name === defaultSellerName) ??
      staffOptions[0];

    if (!selectedStaff) return;

    onConfirm({
      userId: selectedStaff.id,
      name: selectedStaff.full_name,
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-convert-dialog-title"
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="quote-convert-dialog-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        ) : null}

        {showSellerPicker ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              매출 담당자 선택
            </p>
            <SalesSellerFilter
              value={selectedSellerName}
              options={sellerNames}
              onChange={setSelectedSellerName}
            />
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            아니오
          </button>
          <button
            ref={yesButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isPending || (showSellerPicker && !selectedSellerName)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isPending ? "처리 중..." : "네"}
          </button>
        </div>
      </div>
    </div>
  );
}
