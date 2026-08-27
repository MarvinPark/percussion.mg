import Link from "next/link";
import ReservationsList from "@/components/reservations-list";
import { createPageMetadata } from "@/lib/document-titles";
import {
  fetchAllQuoteReservations,
  summarizeQuoteReservations,
} from "@/lib/quote-reservation-list";
import {
  alertError,
  btnSecondary,
  pageMain,
  pageSubtitle,
  pageTitle,
} from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("예약목록");

export default async function ProductReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { rows, error } = await fetchAllQuoteReservations(supabase);
  const summary = summarizeQuoteReservations(rows);

  return (
    <main className={pageMain}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 제품 목록으로
          </Link>
          <h2 className={`${pageTitle} mt-2`}>예약목록</h2>
          <p className={pageSubtitle}>
            견적별·제품별 재고 예약 현황 — 중복 예약 확인용
          </p>
          {rows.length > 0 ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              견적 {summary.quoteCount.toLocaleString("ko-KR")}건 · 제품{" "}
              {summary.productCount.toLocaleString("ko-KR")}종 · 총{" "}
              {summary.totalQuantity.toLocaleString("ko-KR")}개 예약
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quotes" className={btnSecondary}>
            견적 목록
          </Link>
          <Link href="/products" className={btnSecondary}>
            제품 목록
          </Link>
        </div>
      </div>

      {error ? (
        <div className={alertError}>
          <p className="font-medium">예약 목록을 불러오지 못했습니다.</p>
          <p className="mt-2">{error}</p>
        </div>
      ) : (
        <ReservationsList rows={rows} />
      )}
    </main>
  );
}
