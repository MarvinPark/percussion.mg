"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { bulkUpdateProductFields } from "@/app/(main)/products/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type ProductsBulkEditModalProps = {
  productIds: string[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductsBulkEditModal({
  productIds,
  onClose,
  onSaved,
}: ProductsBulkEditModalProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    firstInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const fields: {
      supplier?: string;
      category?: string;
      brand?: string;
    } = {};

    if (supplier.trim()) fields.supplier = supplier.trim();
    if (category.trim()) fields.category = category.trim();
    if (brand.trim()) fields.brand = brand.trim();

    if (!fields.supplier && !fields.category && !fields.brand) {
      setError("수정할 항목을 하나 이상 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await bulkUpdateProductFields(productIds, fields);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="products-bulk-edit-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="products-bulk-edit-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          일괄 수정
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          선택한 {productIds.length}개 제품의 공급처, 품목, 브랜드를 수정합니다.
          입력한 항목만 변경됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="bulk_supplier" className={labelClass}>
              공급처
            </label>
            <input
              ref={firstInputRef}
              id="bulk_supplier"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="변경 없음"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bulk_category" className={labelClass}>
              품목
            </label>
            <input
              id="bulk_category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="변경 없음"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bulk_brand" className={labelClass}>
              브랜드
            </label>
            <input
              id="bulk_brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="변경 없음"
              className={inputClass}
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
