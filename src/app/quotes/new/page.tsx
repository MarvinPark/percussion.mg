import Link from "next/link";
import AppHeader from "@/components/app-header";
import QuoteForm from "@/components/quote-form";
import { buildSaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { getCurrentUserProfile, formatManagerDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/types/profile";
import { redirect } from "next/navigation";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  if (!isProfileComplete(profile)) {
    redirect("/profile/setup");
  }

  const completeProfile = profile!;

  const [{ data: products }, { data: paymentMethods }, { data: salesContacts }] =
    await Promise.all([
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
    supabase
      .from("sales")
      .select(
        "business_partner, customer_name, customer_phone, customer_address, sold_at",
      )
      .order("sold_at", { ascending: false })
      .limit(1000),
  ]);

  const contactSuggestions = buildSaleContactSuggestions(salesContacts ?? []);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/quotes"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 견적 목록으로
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            견적서 작성
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            담당자: {formatManagerDisplayName(completeProfile.full_name, completeProfile.job_title)}{" "}
            · {completeProfile.phone}
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
            <QuoteForm
              products={products}
              paymentMethods={paymentMethods ?? []}
              contactSuggestions={contactSuggestions}
              managerName={formatManagerDisplayName(
                completeProfile.full_name,
                completeProfile.job_title,
              )}
              managerPhone={completeProfile.phone}
            />
          </div>
        )}
      </main>
    </div>
  );
}
