import type { CompanyDocument } from "@/types/company-document";
import type { CompanyDocumentTableColumnId } from "@/lib/company-documents-table-columns";

export const COMPANY_DOCUMENT_SORTABLE_COLUMNS = [
  "title",
  "file",
  "expires_at",
  "created_at",
  "created_by_name",
] as const;

export type CompanyDocumentSortColumn =
  (typeof COMPANY_DOCUMENT_SORTABLE_COLUMNS)[number];

export type CompanyDocumentSortDirection = "asc" | "desc";

export type CompanyDocumentListSort = {
  column: CompanyDocumentSortColumn | null;
  direction: CompanyDocumentSortDirection;
};

export const DEFAULT_COMPANY_DOCUMENT_LIST_SORT: CompanyDocumentListSort = {
  column: null,
  direction: "desc",
};

const SORTABLE_COLUMN_SET = new Set<string>(COMPANY_DOCUMENT_SORTABLE_COLUMNS);

export function isCompanyDocumentSortColumn(
  value: string | undefined | null,
): value is CompanyDocumentSortColumn {
  return Boolean(value && SORTABLE_COLUMN_SET.has(value));
}

export function isSortableCompanyDocumentColumn(
  columnId: CompanyDocumentTableColumnId,
): columnId is CompanyDocumentSortColumn {
  return SORTABLE_COLUMN_SET.has(columnId);
}

export function parseCompanyDocumentListSort(
  sortParam: string | undefined | null,
  orderParam: string | undefined | null,
): CompanyDocumentListSort {
  if (!isCompanyDocumentSortColumn(sortParam)) {
    return DEFAULT_COMPANY_DOCUMENT_LIST_SORT;
  }

  return {
    column: sortParam,
    direction: orderParam === "asc" ? "asc" : "desc",
  };
}

/** 내림차순 → 올림차순 → 등록순(기본) */
export function cycleCompanyDocumentListSort(
  current: CompanyDocumentListSort,
  column: CompanyDocumentSortColumn,
): CompanyDocumentListSort {
  if (current.column !== column) {
    return { column, direction: "desc" };
  }

  if (current.direction === "desc") {
    return { column, direction: "asc" };
  }

  return DEFAULT_COMPANY_DOCUMENT_LIST_SORT;
}

export function getCompanyDocumentSortDirectionForColumn(
  sort: CompanyDocumentListSort,
  column: CompanyDocumentSortColumn,
): CompanyDocumentSortDirection | null {
  if (sort.column !== column) return null;
  return sort.direction;
}

export function companyDocumentListSortToSearchParams(
  sort: CompanyDocumentListSort,
): { sort?: string; order?: string } {
  if (!sort.column) {
    return {};
  }

  return {
    sort: sort.column,
    order: sort.direction,
  };
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, "ko");
}

function compareNullableStrings(left: string | null, right: string | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return compareStrings(left, right);
}

export function sortCompanyDocuments(
  documents: CompanyDocument[],
  sort: CompanyDocumentListSort,
) {
  const sorted = [...documents];
  const activeColumn = sort.column ?? "created_at";
  const direction = sort.column ? sort.direction : "desc";
  const factor = direction === "asc" ? 1 : -1;

  sorted.sort((left, right) => {
    switch (activeColumn) {
      case "title":
        return compareStrings(left.title, right.title) * factor;
      case "file":
        return compareStrings(left.file_name, right.file_name) * factor;
      case "expires_at":
        return (
          compareNullableStrings(left.expires_at, right.expires_at) * factor
        );
      case "created_at":
        return compareStrings(left.created_at, right.created_at) * factor;
      case "created_by_name":
        return (
          compareStrings(
            left.created_by_name ?? "",
            right.created_by_name ?? "",
          ) * factor
        );
      default:
        return compareStrings(left.created_at, right.created_at) * -1;
    }
  });

  return sorted;
}
