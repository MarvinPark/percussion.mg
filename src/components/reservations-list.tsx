"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterQuoteReservations,
  type QuoteReservationRow,
} from "@/lib/quote-reservation-list";
import { cardDashed } from "@/lib/ui-classes";

type ReservationsListProps = {
  rows: QuoteReservationRow[];
};

const rowClass =
  "border-b border-zinc-100 last:border-b-0 dark:border-zinc-800";

export default function ReservationsList({ rows }: ReservationsListProps) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(
    () => filterQuoteReservations(rows, query),
    [query, rows],
  );

  if (rows.length === 0) {
    return (
      <div className={cardDashed}>
        <p className="font-medium text-zinc-800 dark:text-zinc-200">
          현재 예약된 재고가 없습니다.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          견적 목록에서 예약 버튼을 누르면 이 목록에 표시됩니다.
        </p>
        <Link
          href="/quotes"
          className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
        >
          견적 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="고객명, 제품명, 모델명, SKU 검색"
          className="h-9 min-w-[220px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredRows.length.toLocaleString("ko-KR")}건 표시
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap">견적일</th>
                <th className="px-3 py-2.5 whitespace-nowrap">고객명</th>
                <th className="px-3 py-2.5 whitespace-nowrap">담당</th>
                <th className="px-3 py-2.5 whitespace-nowrap">제품명</th>
                <th className="px-3 py-2.5 whitespace-nowrap">모델명</th>
                <th className="px-3 py-2.5 whitespace-nowrap">SKU</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">수량</th>
                <th className="px-3 py-2.5 whitespace-nowrap">예약 시각</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`${rowClass} hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                      {row.quoteDate}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                      {row.customerName}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {row.managerName ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-zinc-800 dark:text-zinc-200">
                      {row.productName}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-zinc-800 dark:text-zinc-200">
                      {row.modelName}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {row.sku}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {row.quantity}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                      {row.reservedAt}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    검색 조건에 맞는 예약이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        예약 해제·수정은{" "}
        <Link href="/quotes" className="font-medium text-blue-600 underline dark:text-blue-400">
          견적 목록
        </Link>
        에서 해당 견적의 예약됨 버튼으로 처리합니다.
      </p>
    </div>
  );
}
