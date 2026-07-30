import Link from "next/link";
import AppHeader from "@/components/app-header";
import KeyStockWorkspace from "@/components/key-stock-workspace";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Product } from "@/types/product";

export default async function KeyStockPage() {
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
    .eq("is_key_stock", true)
    .order("category", { ascending: true })
    .order("brand", { ascending: true })
    .order("model_name", { ascending: true });

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              주요재고현황
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              주요 재고로 체크된 제품만 품목별로 표시합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              제품 목록
            </Link>
            <Link
              href="/products/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              + 제품 등록
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">주요 재고 목록을 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase SQL Editor에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-product-stock-locations.sql
              </code>{" "}
              파일을 실행했는지 확인해 주세요.
            </p>
          </div>
        ) : (
          <KeyStockWorkspace
            userId={user.id}
            products={(products ?? []) as Product[]}
          />
        )}
      </main>
    </div>
  );
}
