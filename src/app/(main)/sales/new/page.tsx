import Link from "next/link";
import SaleForm from "@/components/sale-form";
import { buildSaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { fetchPaymentMethods } from "@/lib/payment-methods";
import { createClient } from "@/lib/supabase/server";
import { SALE_PRODUCT_OPTION_SELECT } from "@/types/sale";
import { redirect } from "next/navigation";

export default async function NewSalePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: products },
    { paymentMethods, error: paymentMethodsError },
    { data: salesContacts },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(SALE_PRODUCT_OPTION_SELECT)
      .order("product_name", { ascending: true }),
    fetchPaymentMethods(supabase),
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
      <main className="mx-auto max-w-app px-4 py-8">
        <div className="mb-6">
          <Link
            href="/sales"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 매출 목록으로
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            판매 등록
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + 버튼으로 여러 제품을 한 번에 등록할 수 있으며, 등록 시 재고가
            자동으로 차감됩니다.
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
        ) : paymentMethodsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">결제 수단을 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-sales.sql
              </code>
              {" "}및{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-sales-update.sql
              </code>
              {" "}을 실행했는지 확인해 주세요.
            </p>
            <Link
              href="/sales/payment-methods"
              className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
            >
              결제 수단 관리로 이동
            </Link>
          </div>
        ) : !paymentMethods.length ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">등록된 결제 수단이 없습니다.</p>
            <p className="mt-2">
              <Link
                href="/sales/payment-methods"
                className="font-medium text-blue-600 underline dark:text-blue-400"
              >
                결제 수단 관리
              </Link>
              에서 결제 방식을 먼저 등록해 주세요.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <SaleForm
              paymentMethods={paymentMethods}
              contactSuggestions={contactSuggestions}
            />
          </div>
        )}
      </main>
  );
}
