"use client";

import { useState, useTransition } from "react";
import { createProductFromFormAction } from "@/app/(main)/products/actions";
import ProductCreateFields from "@/components/product-create-fields";
import type { InlineCreatedProduct } from "@/lib/inline-product-create-shared";

export type InlineProductCreateContext = "sale" | "quote" | "products";

type InlineProductCreateModalProps = {
  context: InlineProductCreateContext;
  initialModelName: string;
  onClose: () => void;
  onCreated: (product: InlineCreatedProduct) => void;
};

const CONTEXT_COPY: Record<
  InlineProductCreateContext,
  { description: string }
> = {
  sale: {
    description:
      "검색되지 않은 제품을 재고에 등록한 뒤 판매에 추가할 수 있습니다.",
  },
  quote: {
    description:
      "검색되지 않은 제품을 재고에 등록한 뒤 견적에 추가할 수 있습니다.",
  },
  products: {
    description: "제품 목록에 바로 등록합니다.",
  },
};

function defaultSku(modelName: string) {
  const sanitized = modelName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "")
    .slice(0, 80);
  return sanitized || "NEW-PRODUCT";
}

export default function InlineProductCreateModal({
  context,
  initialModelName,
  onClose,
  onCreated,
}: InlineProductCreateModalProps) {
  const trimmedModel = initialModelName.trim();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copy = CONTEXT_COPY[context];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await createProductFromFormAction(formData);

        if ("error" in result) {
          setError(result.error ?? "제품 등록에 실패했습니다.");
          return;
        }

        onCreated(result.product);
        onClose();
      } catch {
        setError("제품 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            제품 등록
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {copy.description}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            * 표시는 필수 입력입니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ProductCreateFields
            defaultValues={{
              product_name: trimmedModel,
              model_name: trimmedModel,
              sku: defaultSku(trimmedModel),
            }}
          />

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              {isPending ? "등록 중..." : "제품 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
