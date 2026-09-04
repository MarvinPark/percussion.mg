"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  bulkUpdateSales,
  type BulkUpdateSalesFields,
} from "@/app/(main)/sales/actions";
import BusinessPartnerAutocomplete from "@/components/business-partner-autocomplete";
import type { StaffOption } from "@/components/sales-page-client";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type SalesBulkEditModalProps = {
  saleIds: string[];
  saleCategories: string[];
  staffOptions: StaffOption[];
  onClose: () => void;
  onSaved: () => void;
};

export default function SalesBulkEditModal({
  saleIds,
  saleCategories,
  staffOptions,
  onClose,
  onSaved,
}: SalesBulkEditModalProps) {
  const firstInputRef = useRef<HTMLSelectElement>(null);
  const [sellerName, setSellerName] = useState("");
  const [businessPartner, setBusinessPartner] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [saleCategory, setSaleCategory] = useState("");
  const [soldAt, setSoldAt] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sellerOptions = useMemo(
    () => staffOptions.map((staff) => staff.full_name),
    [staffOptions],
  );

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

    const fields: BulkUpdateSalesFields = {};

    if (sellerName.trim()) {
      const matchedStaff = staffOptions.find(
        (staff) => staff.full_name === sellerName.trim(),
      );
      fields.created_by_name = sellerName.trim();
      fields.created_by_user_id = matchedStaff?.id ?? null;
    }

    if (saleCategory.trim()) {
      fields.sale_category = saleCategory.trim();
    }

    if (soldAt.trim()) {
      fields.sold_at = soldAt.trim();
    }

    if (quantity.trim()) {
      fields.quantity = Number(quantity);
    }

    if (businessPartner.trim()) {
      fields.business_partner = businessPartner.trim();
      fields.partner_id = partnerId.trim() || null;
    }

    if (
      fields.created_by_name === undefined &&
      fields.sale_category === undefined &&
      fields.sold_at === undefined &&
      fields.quantity === undefined &&
      fields.business_partner === undefined
    ) {
      setError("수정할 항목을 하나 이상 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await bulkUpdateSales(saleIds, fields);
      if (result.error && !result.updated) {
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
        aria-labelledby="sales-bulk-edit-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="sales-bulk-edit-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          일괄 수정
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          선택한 {saleIds.length}건의 판매자, 거래처명, 구분, 날짜, 수량을 수정합니다.
          입력한 항목만 변경됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="bulk_seller" className={labelClass}>
              판매자
            </label>
            <select
              ref={firstInputRef}
              id="bulk_seller"
              value={sellerName}
              onChange={(event) => setSellerName(event.target.value)}
              className={inputClass}
            >
              <option value="">변경 없음</option>
              {sellerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulk_business_partner" className={labelClass}>
              거래처명
            </label>
            <BusinessPartnerAutocomplete
              id="bulk_business_partner"
              name="business_partner"
              value={businessPartner}
              partnerId={partnerId}
              onChange={setBusinessPartner}
              onPartnerIdChange={setPartnerId}
              placeholder="예: OO음악학원"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bulk_sale_category" className={labelClass}>
              구분
            </label>
            <select
              id="bulk_sale_category"
              value={saleCategory}
              onChange={(event) => setSaleCategory(event.target.value)}
              className={inputClass}
            >
              <option value="">변경 없음</option>
              {saleCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulk_sold_at" className={labelClass}>
              날짜
            </label>
            <input
              id="bulk_sold_at"
              type="date"
              value={soldAt}
              onChange={(event) => setSoldAt(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bulk_quantity" className={labelClass}>
              수량
            </label>
            <input
              id="bulk_quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
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
