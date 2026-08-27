import Link from "next/link";
import { createPageMetadata } from "@/lib/document-titles";
import {
  alertError,
  btnPrimary,
  btnSecondary,
  cardDashed,
  pageMain,
  pageSubtitle,
  pageTitle,
} from "@/lib/ui-classes";
import QuotesPageClient from "@/components/quotes-page-client";
import { buildSaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { fetchPaymentMethods } from "@/lib/payment-methods";
import { fetchSaleCategoryOptions } from "@/lib/sale-category-options";
import { fetchAllProductSkus } from "@/lib/quote-product-search";
import { getCurrentUserProfile, formatManagerDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("견적");

export default async function QuotesPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const [
    { data: quotes, error },
    productSkus,
    { paymentMethods: paymentMethodsResult },
    { data: linkedSales },
    { data: salesContacts },
    { data: staffProfiles },
    { names: saleCategories },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, quote_items(*, products(color, product_option, size))")
      .order("created_at", { ascending: false })
      .limit(5000),
    fetchAllProductSkus(supabase),
    fetchPaymentMethods(supabase),
    supabase
      .from("sales")
      .select("quote_id")
      .not("quote_id", "is", null)
      .limit(500),
    supabase
      .from("sales")
      .select(
        "business_partner, customer_name, customer_phone, customer_address, sold_at",
      )
      .order("sold_at", { ascending: false })
      .limit(300),
    supabase
      .from("profiles")
      .select("id, full_name")
      .not("full_name", "is", null)
      .order("full_name"),
    fetchSaleCategoryOptions(supabase),
  ]);

  const paymentMethods = paymentMethodsResult;

  const staffOptions = (staffProfiles ?? [])
    .filter((profile) => profile.full_name?.trim())
    .map((profile) => ({
      id: profile.id,
      full_name: profile.full_name.trim(),
    }));

  const contactSuggestions = buildSaleContactSuggestions(salesContacts ?? []);

  const convertedQuoteIds = [
    ...new Set(
      (linkedSales ?? [])
        .map((row) => row.quote_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  return (
      <main className={pageMain}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={pageTitle}>견적</h2>
            <p className={pageSubtitle}>견적 클릭으로 수정 · 매출전환</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/products/reservations" className={btnSecondary}>
              예약목록
            </Link>
            <Link href="/quotes/new" className={btnPrimary}>
              +견적서 작성
            </Link>
          </div>
        </div>

        {error ? (
          <div className={alertError}>
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
          <div className={cardDashed}>
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
            userId={user.id}
            quotes={quotes}
            productSkus={productSkus}
            paymentMethods={paymentMethods}
            saleCategories={saleCategories}
            convertedQuoteIds={convertedQuoteIds}
            contactSuggestions={contactSuggestions}
            managerName={formatManagerDisplayName(
              profile?.full_name,
              profile?.job_title,
            )}
            managerPhone={profile?.phone ?? ""}
            currentUserName={profile?.full_name?.trim() ?? ""}
            staffOptions={staffOptions}
          />
        )}
      </main>
  );
}
