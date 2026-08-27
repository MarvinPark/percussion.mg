"use client";

import { useRef, useState, useTransition } from "react";
import { createProductInlineList } from "@/app/(main)/products/actions";
import PriceInput from "@/components/price-input";

const fieldClass =
  "h-[26px] w-full min-w-0 rounded border border-zinc-300 bg-white px-2 text-[11px] leading-none text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const labelClass =
  "mb-0.5 block text-[10px] font-semibold leading-none text-zinc-600 dark:text-zinc-400";

const actionButtonClass =
  "inline-flex h-[26px] shrink-0 items-center justify-center rounded border border-zinc-300 bg-white px-2 text-[11px] leading-none font-normal text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const submitButtonClass =
  "inline-flex h-[26px] shrink-0 items-center justify-center rounded border border-blue-600 bg-blue-600 px-2 text-[11px] leading-none font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500 dark:bg-blue-500";

type ProductInlineRegisterPanelProps = {
  onClose: () => void;
  onOpenPopup: () => void;
  onRegistered?: (productId: string) => void;
};

const EMPTY_FORM = {
  supplier: "",
  category: "",
  brand: "",
  product_name: "",
  model_name: "",
  sku: "",
  purchase_price: 0,
  sale_price: 0,
  stock_floor3: 0,
  stock_b1: 0,
  stock_display: 0,
};

export default function ProductInlineRegisterPanel({
  onClose,
  onOpenPopup,
  onRegistered,
}: ProductInlineRegisterPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("supplier", form.supplier);
    formData.set("category", form.category);
    formData.set("brand", form.brand);
    formData.set("product_name", form.product_name);
    formData.set("model_name", form.model_name);
    formData.set("sku", form.sku);
    formData.set("purchase_price", String(form.purchase_price));
    formData.set("sale_price", String(form.sale_price));
    formData.set("stock_floor3", String(form.stock_floor3));
    formData.set("stock_b1", String(form.stock_b1));
    formData.set("stock_display", String(form.stock_display));
    formData.set("min_stock_quantity", "0");

    startTransition(async () => {
      const result = await createProductInlineList(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      setForm(EMPTY_FORM);
      formRef.current?.reset();
      if (result.productId) {
        onRegistered?.(result.productId);
      }
    });
  }

  return (
    <div className="border-b border-zinc-200 bg-emerald-50/30 px-3 py-2 dark:border-zinc-700 dark:bg-emerald-950/10">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[5rem] flex-1">
            <label className={labelClass}>
              공급처 <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.supplier}
              onChange={(event) => updateField("supplier", event.target.value)}
              className={fieldClass}
              placeholder="공급처"
            />
          </div>
          <div className="min-w-[4.5rem] flex-1">
            <label className={labelClass}>품목</label>
            <input
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              className={fieldClass}
              placeholder="품목"
            />
          </div>
          <div className="min-w-[4.5rem] flex-1">
            <label className={labelClass}>브랜드</label>
            <input
              value={form.brand}
              onChange={(event) => updateField("brand", event.target.value)}
              className={fieldClass}
              placeholder="브랜드"
            />
          </div>
          <div className="min-w-[7rem] flex-[1.4]">
            <label className={labelClass}>
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.product_name}
              onChange={(event) =>
                updateField("product_name", event.target.value)
              }
              className={fieldClass}
              placeholder="제품명"
            />
          </div>
          <div className="min-w-[6rem] flex-[1.2]">
            <label className={labelClass}>
              모델명 <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.model_name}
              onChange={(event) => updateField("model_name", event.target.value)}
              className={fieldClass}
              placeholder="모델명"
            />
          </div>
          <div className="min-w-[5.5rem] flex-1">
            <label className={labelClass}>
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.sku}
              onChange={(event) => updateField("sku", event.target.value)}
              className={fieldClass}
              placeholder="SKU"
            />
          </div>
          <div className="min-w-[5rem]">
            <label className={labelClass}>매입가</label>
            <PriceInput
              min={0}
              value={form.purchase_price}
              onChange={(value) => updateField("purchase_price", value)}
              className={fieldClass}
            />
          </div>
          <div className="min-w-[5rem]">
            <label className={labelClass}>소비자가</label>
            <PriceInput
              min={0}
              value={form.sale_price}
              onChange={(value) => updateField("sale_price", value)}
              className={fieldClass}
            />
          </div>
          <div className="w-12">
            <label className={labelClass}>3층</label>
            <input
              type="number"
              min={0}
              value={form.stock_floor3}
              onChange={(event) =>
                updateField(
                  "stock_floor3",
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
              className={fieldClass}
            />
          </div>
          <div className="w-12">
            <label className={labelClass}>B1</label>
            <input
              type="number"
              min={0}
              value={form.stock_b1}
              onChange={(event) =>
                updateField(
                  "stock_b1",
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
              className={fieldClass}
            />
          </div>
          <div className="w-12">
            <label className={labelClass}>의왕</label>
            <input
              type="number"
              min={0}
              value={form.stock_display}
              onChange={(event) =>
                updateField(
                  "stock_display",
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
              className={fieldClass}
            />
          </div>
          <div className="flex shrink-0 items-end gap-1">
            <button
              type="submit"
              disabled={isPending}
              className={submitButtonClass}
            >
              {isPending ? "등록 중..." : "등록"}
            </button>
            <button
              type="button"
              onClick={onOpenPopup}
              className={actionButtonClass}
            >
              팝업
            </button>
            <button type="button" onClick={onClose} className={actionButtonClass}>
              닫기
            </button>
          </div>
        </div>

        {error ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
