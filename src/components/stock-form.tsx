"use client";

import { useActionState } from "react";
import { registerStockMovement } from "@/app/(main)/products/actions";
import type { Product } from "@/types/product";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const labelClass = "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type StockFormProps = {
  products: Product[];
  preselectedProductId?: string;
};

export default function StockForm({
  products,
  preselectedProductId,
}: StockFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await registerStockMovement(formData)) ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="product_id" className={labelClass}>
          제품 선택 <span className="text-red-500">*</span>
        </label>
        <select
          id="product_id"
          name="product_id"
          required
          defaultValue={preselectedProductId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            제품을 선택하세요
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.product_name} / {product.model_name} ({product.supplier})
              — 재고 {product.stock_quantity}개
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className={labelClass}>
          종류 <span className="text-red-500">*</span>
        </p>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <input
              type="radio"
              name="movement_type"
              value="in"
              defaultChecked
              className="accent-blue-600"
            />
            입고 (재고 증가)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <input
              type="radio"
              name="movement_type"
              value="out"
              className="accent-blue-600"
            />
            출고 (재고 감소)
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="quantity" className={labelClass}>
          수량 <span className="text-red-500">*</span>
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          required
          placeholder="예: 5"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="note" className={labelClass}>
          메모 (선택)
        </label>
        <input
          id="note"
          name="note"
          placeholder="예: A사 입고, 전시용 출고"
          className={inputClass}
        />
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {isPending ? "저장 중..." : "입고/출고 기록"}
      </button>
    </form>
  );
}
