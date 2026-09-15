"use client";

import { useActionState, useEffect, useState } from "react";
import { createProduct, updateProduct } from "@/app/(main)/products/actions";
import ProductCreateFields from "@/components/product-create-fields";
import ProductRegistrationReportModal from "@/components/product-registration-report-modal";
import type { Product } from "@/types/product";

type ProductFormProps = {
  product?: Product;
};

export default function ProductForm({ product }: ProductFormProps) {
  const isEdit = !!product;
  const [reportOpen, setReportOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      if (isEdit) {
        formData.set("id", product.id);
        return (await updateProduct(formData)) ?? null;
      }
      return (await createProduct(formData)) ?? null;
    },
    null,
  );

  useEffect(() => {
    if (state?.error) {
      setReportOpen(true);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit ? <input type="hidden" name="id" value={product.id} /> : null}

      <ProductCreateFields product={product} isEdit={isEdit} />

      {state?.error && !reportOpen ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400 sm:w-auto"
      >
        {isPending
          ? isEdit
            ? "저장 중..."
            : "등록 중..."
          : isEdit
            ? "수정 저장"
            : "제품 등록"}
      </button>

      {reportOpen && state?.error ? (
        <ProductRegistrationReportModal
          report={{
            title: isEdit ? "제품 수정 실패" : "제품 등록 실패",
            description: "입력 내용을 확인한 뒤 다시 시도해 주세요.",
            error: state.error,
          }}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </form>
  );
}
