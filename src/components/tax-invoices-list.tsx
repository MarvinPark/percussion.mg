"use client";

import { formatKRW } from "@/lib/sales-calculator";
import { formatTaxInvoiceDateLabel } from "@/lib/tax-invoice-issues";
import type { TaxInvoiceIssue } from "@/types/tax-invoice";

type TaxInvoicesListProps = {
  issues: TaxInvoiceIssue[];
  emptyMessage?: string;
};

export default function TaxInvoicesList({
  issues,
  emptyMessage,
}: TaxInvoicesListProps) {
  if (issues.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
        {emptyMessage ?? "발행된 세금계산서가 없습니다."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <tr>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">발행일시</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">작성일</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">거래처</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">품목</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">매출</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-right">
              합계
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">구분</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">문서번호</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">발행자</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">환경</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr
              key={issue.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {formatTaxInvoiceDateLabel(issue.created_at.slice(0, 10))}
                <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {issue.created_at.slice(11, 16)}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {formatTaxInvoiceDateLabel(issue.write_date)}
              </td>
              <td className="px-3 py-2.5">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {issue.partner_name}
                </p>
                {issue.partner_email ? (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {issue.partner_email}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                {issue.item_name}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                {issue.sale_count}건
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatKRW(issue.total_amount)}원
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                {issue.purpose_type}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                {issue.mgt_key}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                {issue.issued_by_name || "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${
                    issue.is_test
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                  }`}
                >
                  {issue.is_test ? "테스트" : "운영"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
