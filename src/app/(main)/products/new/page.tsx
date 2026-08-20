import Link from "next/link";
import ProductForm from "./product-form";
import { createPageMetadata } from "@/lib/document-titles";

export const metadata = createPageMetadata("제품등록");

export default function NewProductPage() {
  return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 제품 목록으로
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            제품 등록
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            새 제품을 등록합니다. * 표시는 필수 입력입니다.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ProductForm />
        </div>
      </main>
  );
}
