import Link from "next/link";
import StockForm from "@/components/stock-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ product?: string }>;
};

export default async function StockPage({ searchParams }: PageProps) {
  const { product: preselectedProductId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });

  const { data: preselectedProduct } = preselectedProductId
    ? await supabase.from("products").select("*").eq("id", preselectedProductId).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto max-w-app px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 제품 목록으로
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            입고기록
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            여러 제품을 한 번에 입고 기록할 수 있습니다.
          </p>
        </div>
        <Link
          href="/products/stock/list"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          입고목록
        </Link>
      </div>

      {!count ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            등록된 제품이 없습니다.
          </p>
          <Link
            href="/products/new"
            className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
          >
            먼저 제품을 등록해 주세요
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <StockForm initialProduct={preselectedProduct} />
        </div>
      )}
    </main>
  );
}
