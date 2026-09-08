"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteTaxInvoiceIssue } from "@/app/(main)/sales/invoice-actions";
import SalesSellerFilter from "@/components/sales-seller-filter";
import TablePageSizeSelect from "@/components/table-page-size-select";
import TablePagination from "@/components/table-pagination";
import TaxInvoiceDetailDialog from "@/components/tax-invoice-detail-dialog";
import { formatKRW } from "@/lib/sales-calculator";
import { formatTaxInvoiceDateLabel } from "@/lib/tax-invoice-issues";
import {
  loadTaxInvoicesPageSize,
  saveTaxInvoicesPageSize,
} from "@/lib/tax-invoices-list-preferences";
import {
  filterTaxInvoiceIssues,
  getUniqueTaxInvoiceIssuers,
} from "@/lib/tax-invoices-search";
import {
  paginateItems,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";
import type { TaxInvoiceIssue } from "@/types/tax-invoice";

const partnerSearchClass =
  "h-[26px] w-44 rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-none text-zinc-900 placeholder:text-xs placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:w-52";

const deleteButtonClass =
  "rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium leading-none text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900";

type TaxInvoicesListProps = {
  issues: TaxInvoiceIssue[];
  userId: string;
  canManageSales?: boolean;
  emptyMessage?: string;
};

export default function TaxInvoicesList({
  issues,
  userId,
  canManageSales = false,
  emptyMessage,
}: TaxInvoicesListProps) {
  const router = useRouter();
  const [selectedIssue, setSelectedIssue] = useState<TaxInvoiceIssue | null>(null);
  const [issuerFilter, setIssuerFilter] = useState("");
  const [partnerQuery, setPartnerQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(TABLE_PAGE_SIZE);
  const [pageSizeLoaded, setPageSizeLoaded] = useState(false);
  const [deletingIssueId, setDeletingIssueId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  useEffect(() => {
    setPageSize(loadTaxInvoicesPageSize(userId));
    setPageSizeLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!pageSizeLoaded) return;
    saveTaxInvoicesPageSize(userId, pageSize);
  }, [pageSizeLoaded, pageSize, userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [issuerFilter, partnerQuery, pageSize]);

  const issuerOptions = useMemo(
    () => getUniqueTaxInvoiceIssuers(issues),
    [issues],
  );

  const filteredIssues = useMemo(
    () =>
      filterTaxInvoiceIssues(issues, {
        issuer: issuerFilter,
        partnerQuery,
      }),
    [issues, issuerFilter, partnerQuery],
  );

  const pagination = useMemo(
    () => paginateItems(filteredIssues, currentPage, pageSize),
    [filteredIssues, currentPage, pageSize],
  );

  function handleDeleteIssue(issue: TaxInvoiceIssue) {
    if (!issue.is_test) return;

    const confirmed = window.confirm(
      "이 테스트 발행 내역을 삭제하시겠습니까? 연결된 매출은 다시 세금계산서를 발행할 수 있습니다.",
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeletingIssueId(issue.id);
    startDelete(async () => {
      const result = await deleteTaxInvoiceIssue({ issueId: issue.id });
      setDeletingIssueId(null);

      if ("error" in result) {
        setDeleteError(result.error ?? "삭제에 실패했습니다.");
        return;
      }

      if (selectedIssue?.id === issue.id) {
        setSelectedIssue(null);
      }
      router.refresh();
    });
  }

  if (issues.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
        {emptyMessage ?? "발행된 세금계산서가 없습니다."}
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="shrink-0">발행자</span>
            <SalesSellerFilter
              value={issuerFilter}
              options={issuerOptions}
              onChange={setIssuerFilter}
              showAllOption
              allOptionLabel="전체"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="shrink-0">거래처</span>
            <input
              type="search"
              value={partnerQuery}
              onChange={(event) => setPartnerQuery(event.target.value)}
              placeholder="거래처·품목 검색"
              className={partnerSearchClass}
            />
          </label>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {filteredIssues.length}건 / 전체 {issues.length}건
          </span>
        </div>
        <TablePageSizeSelect value={pageSize} onChange={setPageSize} compact />
      </div>

      {deleteError ? (
        <p className="mb-3 text-sm text-red-700 dark:text-red-300">{deleteError}</p>
      ) : null}

      {filteredIssues.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
          검색 조건에 맞는 발행 내역이 없습니다.
        </p>
      ) : (
        <>
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
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">상태</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">발행자</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">환경</th>
                  {canManageSales ? (
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-center">
                      관리
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-blue-50/60 dark:border-zinc-800 dark:hover:bg-blue-950/20"
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
                      {issue.cancelled_at
                        ? "발행취소"
                        : issue.popbill_state || "-"}
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
                    {canManageSales ? (
                      <td
                        className="whitespace-nowrap px-3 py-2.5 text-center"
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                      >
                        {issue.is_test ? (
                          <button
                            type="button"
                            disabled={deletingIssueId === issue.id}
                            onClick={() => handleDeleteIssue(issue)}
                            className={deleteButtonClass}
                          >
                            {deletingIssueId === issue.id ? "삭제 중…" : "삭제"}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">-</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="세금계산서 발행 내역 페이지"
          />
        </>
      )}

      {selectedIssue ? (
        <TaxInvoiceDetailDialog
          issue={selectedIssue}
          canManageSales={canManageSales}
          onClose={() => setSelectedIssue(null)}
          onUpdated={() => {
            setSelectedIssue(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
