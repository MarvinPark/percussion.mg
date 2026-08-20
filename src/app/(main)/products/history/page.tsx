import Link from "next/link";
import { createPageMetadata } from "@/lib/document-titles";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  movementTypeLabel,
  type StockMovementWithProduct,
} from "@/types/stock-movement";

export const metadata = createPageMetadata("변동이력");

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function typeBadgeClass(type: string) {
  if (type === "in") {
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  }
  if (type === "out") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  }
  return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
}

export default async function StockHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: movements, error } = await supabase
    .from("stock_movements")
    .select(
      "*, products(product_name, model_name, sku, supplier)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
      <main className="mx-auto max-w-app px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/products"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              ← 제품 목록으로
            </Link>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              재고 변동 이력
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              입고, 출고, 직접 수정 기록을 최근 100건까지 보여줍니다.
            </p>
          </div>
          <Link
            href="/products/stock"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            + 입고기록
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">이력을 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase SQL Editor에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema-phase4.sql
              </code>{" "}
              파일을 실행했는지 확인해 주세요.
            </p>
          </div>
        ) : !movements?.length ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              아직 재고 변동 기록이 없습니다.
            </p>
            <Link
              href="/products/stock"
              className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
            >
              첫 입고 기록하기
            </Link>
          </div>
        ) : (
          <>
            {/* 모바일 */}
            <div className="space-y-3 md:hidden">
              {(movements as StockMovementWithProduct[]).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.products?.product_name ?? "삭제된 제품"}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatDate(item.created_at)}
                        {item.modified_by_name ? (
                          <span className="ml-2">{item.modified_by_name}</span>
                        ) : null}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(item.movement_type)}`}
                    >
                      {movementTypeLabel[item.movement_type]}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                        수량
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {item.quantity}개
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                        재고 변화
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {item.stock_before} → {item.stock_after}
                      </dd>
                    </div>
                    {item.note ? (
                      <div className="col-span-2">
                        <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                          메모
                        </dt>
                        <dd className="text-zinc-900 dark:text-zinc-100">
                          {item.note}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ))}
            </div>

            {/* PC */}
            <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white md:block dark:border-zinc-700 dark:bg-zinc-900">
              <table className="min-w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">날짜</th>
                    <th className="px-4 py-3 font-semibold">수정자</th>
                    <th className="px-4 py-3 font-semibold">제품명</th>
                    <th className="px-4 py-3 font-semibold">공급처</th>
                    <th className="px-4 py-3 font-semibold">종류</th>
                    <th className="px-4 py-3 font-semibold">수량</th>
                    <th className="px-4 py-3 font-semibold">재고 변화</th>
                    <th className="px-4 py-3 font-semibold">메모</th>
                  </tr>
                </thead>
                <tbody>
                  {(movements as StockMovementWithProduct[]).map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {item.modified_by_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        <p>{item.products?.product_name ?? "삭제된 제품"}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {item.products?.model_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {item.products?.supplier ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(item.movement_type)}`}
                        >
                          {movementTypeLabel[item.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {item.quantity}개
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {item.stock_before} → {item.stock_after}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {item.note ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
  );
}
