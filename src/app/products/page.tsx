import Link from "next/link";
import AppHeader from "@/components/app-header";
import ProductsWorkspace from "@/components/products-workspace";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Product } from "@/types/product";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              제품 목록
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              행을 클릭하면 선택됩니다. 우클릭하면 복사·수정·상세보기 등
              메뉴를 사용할 수 있습니다. 헤더 오른쪽 세로 막대를 드래그하면
              열 너비를 조절할 수 있으며, 설정은 계정별로 저장됩니다.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/products/key-stock"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                주요재고현황
              </Link>
              <Link
                href="/products/stock"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                입고/출고
              </Link>
              <Link
                href="/products/history"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                변동 이력
              </Link>
              <Link
                href="/products/new"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                + 제품 등록
              </Link>
          </div>
        </div>

        {!error && products?.length ? (
          <ProductsWorkspace
            userId={user.id}
            products={products as Product[]}
          />
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">제품 목록을 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase SQL Editor에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema.sql
              </code>{" "}
              파일 내용을 실행했는지 확인해 주세요.
            </p>
          </div>
        ) : !products?.length ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              아직 등록된 제품이 없습니다.
            </p>
            <Link
              href="/products/new"
              className="mt-4 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              첫 제품 등록하기
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
