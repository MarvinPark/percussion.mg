import Link from "next/link";
import AppHeader from "@/components/app-header";
import QuotesPageClient from "@/components/quotes-page-client";
import { getCurrentUserProfile, formatManagerDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function QuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getCurrentUserProfile(supabase);

  const [
    { data: quotes, error },
    { data: products },
    { data: paymentMethods },
    { data: linkedSales },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, quote_items(*)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("products")
      .select(
        "id, product_name, model_name, sku, supplier, category, brand, sale_price, purchase_price",
      )
      .order("model_name", { ascending: true }),
    supabase
      .from("payment_methods")
      .select("id, name, fee_rate, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("sales").select("quote_id").not("quote_id", "is", null),
  ]);

  const convertedQuoteIds = [
    ...new Set(
      (linkedSales ?? [])
        .map((row) => row.quote_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              견적관리
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              견적 클릭으로 수정 · 매출전환
            </p>
          </div>
          <Link
            href="/quotes/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            + 견적서 작성
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">견적 데이터를 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase SQL Editor에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-quotes.sql
              </code>{" "}
              및{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-quotes-update.sql
              </code>{" "}
              파일을 실행했는지 확인해 주세요.
            </p>
          </div>
        ) : !quotes?.length ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              아직 견적 기록이 없습니다.
            </p>
            <Link
              href="/quotes/new"
              className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
            >
              첫 견적서 작성하기
            </Link>
          </div>
        ) : (
          <QuotesPageClient
            quotes={quotes}
            products={products ?? []}
            paymentMethods={paymentMethods ?? []}
            convertedQuoteIds={convertedQuoteIds}
            managerName={formatManagerDisplayName(
              profile?.full_name,
              profile?.job_title,
            )}
            managerPhone={profile?.phone ?? ""}
          />
        )}
      </main>
    </div>
  );
}
