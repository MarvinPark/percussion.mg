"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PartnersTable from "@/components/partners-table";
import TablePagination from "@/components/table-pagination";
import TableRowSizeControl from "@/components/table-row-size-control";
import {
  loadPartnersPageSize,
  savePartnersPageSize,
} from "@/lib/partners-list-preferences";
import {
  DEFAULT_TABLE_ROW_FONT_SIZE,
  loadTableRowFontSize,
  saveTableRowFontSize,
} from "@/lib/table-row-preferences";
import {
  paginateItems,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";
import type { BusinessPartner } from "@/types/business-partner";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const toolbarButtonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type PartnersPageClientProps = {
  userId: string;
  partners: BusinessPartner[];
  canManage: boolean;
  initialSearch: string;
  needsMigration?: boolean;
  needsColumnMigration?: boolean;
  needsMemoColumnMigration?: boolean;
};

export default function PartnersPageClient({
  userId,
  partners,
  canManage,
  initialSearch,
  needsMigration = false,
  needsColumnMigration = false,
  needsMemoColumnMigration = false,
}: PartnersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(TABLE_PAGE_SIZE);
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [pageSizeLoaded, setPageSizeLoaded] = useState(false);

  useEffect(() => {
    setSearch(initialSearch);
    setCurrentPage(1);
  }, [initialSearch]);

  useEffect(() => {
    setPageSize(loadPartnersPageSize(userId));
    setRowFontSize(loadTableRowFontSize("partners", userId));
    setPreferencesLoaded(true);
    setPageSizeLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!pageSizeLoaded) return;
    savePartnersPageSize(userId, pageSize);
  }, [pageSizeLoaded, pageSize, userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    saveTableRowFontSize("partners", userId, rowFontSize);
  }, [preferencesLoaded, rowFontSize, userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  function applySearch(nextSearch: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextSearch.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    router.replace(`/partners?${params.toString()}`);
  }

  const pagination = useMemo(
    () => paginateItems(partners, currentPage, pageSize),
    [partners, currentPage, pageSize],
  );

  const emptyMessage = initialSearch.trim()
    ? "검색 결과가 없습니다."
    : "등록된 거래처가 없습니다.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <form
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch(search);
          }}
        >
          <div className="min-w-[220px] flex-1">
            <input
              id="partner_search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="상호, 담당자, 사업자번호, 연락처"
              className={inputClass}
            />
          </div>
          <button type="submit" className={toolbarButtonClass}>
            검색
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            disabled={!search.trim() && !initialSearch.trim()}
            onClick={() => {
              setSearch("");
              applySearch("");
            }}
          >
            전체보기
          </button>
        </form>

        <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
      </div>

      {needsMigration ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">거래처 테이블이 아직 없습니다.</p>
          <p className="mt-1">
            Supabase SQL Editor에서{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              supabase/schema-business-partners.sql
            </code>
            {" "}을 실행해 주세요.
          </p>
        </div>
      ) : null}

      {needsColumnMigration ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">공급받는자 필드 확장 SQL이 필요합니다.</p>
          <p className="mt-1">
            Supabase SQL Editor에서{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              supabase/schema-business-partners-update.sql
            </code>
            {" "}을 실행해 주세요.
          </p>
        </div>
      ) : null}

      {needsMemoColumnMigration ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">메모 컬럼 SQL이 필요합니다.</p>
          <p className="mt-1">
            Supabase SQL Editor에서{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              supabase/schema-business-partners-update.sql
            </code>
            {" "}을 실행해 주세요.
          </p>
        </div>
      ) : null}

      {!needsMigration ? (
        <>
          <PartnersTable
            userId={userId}
            partners={pagination.items}
            totalCount={partners.length}
            canManage={canManage}
            rowFontSize={rowFontSize}
            emptyMessage={emptyMessage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />

          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="거래처 목록 페이지"
          />
        </>
      ) : null}
    </div>
  );
}
