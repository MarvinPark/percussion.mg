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

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("product_name", { ascending: true });

  return (
      <main className="mx-auto max-w-app px-4 py-8">
        <div className="mb-6">
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 제품 목록으로
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            입고 / 출고
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            제품 입고·출고를 기록하면 재고가 자동으로 변경됩니다.
          </p>
        </div>

        {!products?.length ? (
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
            <StockForm
              products={products}
              preselectedProductId={preselectedProductId}
            />
          </div>
        )}
      </main>
  );
}
