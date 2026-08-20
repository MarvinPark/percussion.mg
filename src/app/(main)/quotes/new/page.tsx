import Link from "next/link";
import QuoteForm from "@/components/quote-form";
import { createPageMetadata } from "@/lib/document-titles";
import { buildSaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { fetchPaymentMethods } from "@/lib/payment-methods";
import { fetchSaleCategoryOptions } from "@/lib/sale-category-options";
import { getCurrentUserProfile, formatManagerDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { canUseApp } from "@/types/profile";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("견적서 작성");

export default async function NewQuotePage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  if (!canUseApp(profile)) {
    redirect("/profile/setup");
  }

  const completeProfile = profile!;

  const [
    { count: productCount },
    { paymentMethods },
    { data: salesContacts },
    { names: saleCategories },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    fetchPaymentMethods(supabase),
    supabase
      .from("sales")
      .select(
        "business_partner, customer_name, customer_phone, customer_address, sold_at",
      )
      .order("sold_at", { ascending: false })
      .limit(1000),
    fetchSaleCategoryOptions(supabase),
  ]);

  const contactSuggestions = buildSaleContactSuggestions(salesContacts ?? []);

  return (
      <main className="mx-auto max-w-app px-4 py-8">
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
        </div>

        {!productCount ? (
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
              paymentMethods={paymentMethods}
              saleCategories={saleCategories}
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
  );
}
