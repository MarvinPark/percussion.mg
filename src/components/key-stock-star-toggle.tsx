"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleKeyStock } from "@/app/products/actions";

type KeyStockStarToggleProps = {
  productId: string;
  productName: string;
  isKeyStock: boolean;
  readOnly?: boolean;
};

export default function KeyStockStarToggle({
  productId,
  productName,
  isKeyStock: initialKeyStock,
  readOnly = false,
}: KeyStockStarToggleProps) {
  const router = useRouter();
  const [isKeyStock, setIsKeyStock] = useState(initialKeyStock);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsKeyStock(initialKeyStock);
  }, [initialKeyStock]);

  function handleClick() {
    if (readOnly) return;
    startTransition(async () => {
      const result = await toggleKeyStock(productId);
      if (result.error) return;
      if (typeof result.is_key_stock === "boolean") {
        setIsKeyStock(result.is_key_stock);
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || readOnly}
      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
      aria-label={
        isKeyStock
          ? `${productName} 주요 재고 해제`
          : `${productName} 주요 재고로 지정`
      }
      title={isKeyStock ? "주요 재고" : "주요 재고로 지정"}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={`h-4 w-4 transition-colors ${
          isKeyStock
            ? "fill-yellow-400 text-yellow-400"
            : "fill-transparent text-zinc-300 dark:text-zinc-600"
        }`}
      >
        <path
          stroke="currentColor"
          strokeWidth={isKeyStock ? 0 : 1.5}
          strokeLinejoin="round"
          d="M12 2.5l2.55 5.87 6.37.55-4.82 4.18 1.46 6.23L12 16.9l-5.56 2.93 1.46-6.23-4.82-4.18 6.37-.55L12 2.5z"
        />
      </svg>
    </button>
  );
}
