"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { updateStock } from "@/app/products/actions";

export type StockEditProduct = {
  id: string;
  product_name: string;
  model_name?: string | null;
  stock_quantity: number;
  min_stock_quantity: number;
};

type StockEditModalProps = {
  product: StockEditProduct;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

export default function StockEditModal({ product, onClose }: StockEditModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stockQuantity, setStockQuantity] = useState(String(product.stock_quantity));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const quantity = Number(stockQuantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      setError("재고는 0 이상 숫자여야 합니다.");
      return;
    }

    const formData = new FormData();
    formData.set("id", product.id);
    formData.set("stock_quantity", String(quantity));

    startTransition(async () => {
      await updateStock(formData);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              재고 수정
            </h3>
            <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-400">
              {product.product_name}
              {product.model_name ? ` · ${product.model_name}` : ""}
            </p>
          </div>
        </div>

        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          현재 {product.stock_quantity}개 · 최소 알림 {product.min_stock_quantity}개
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="stock_quantity" className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              재고 수량
            </label>
            <input
              ref={inputRef}
              id="stock_quantity"
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              className={inputClass}
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
