import Link from "next/link";
import KeyStockWorkspace from "@/components/key-stock-workspace";
import {
  fetchAllKeyStockProducts,
} from "@/lib/key-stock-loader";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function KeyStockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const products = await fetchAllKeyStockProducts(supabase);

  return (
      <main className="mx-auto max-w-app px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              주요재고
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

        <KeyStockWorkspace userId={user.id} products={products} />
      </main>
  );
}
