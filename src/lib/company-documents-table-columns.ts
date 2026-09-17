import type { ConfigurableTableColumn } from "@/lib/configurable-table-columns";

export type CompanyDocumentTableColumnId =
  | "title"
  | "file"
  | "expires_at"
  | "created_at"
  | "created_by_name"
  | "delete";

export const COMPANY_DOCUMENT_TABLE_COLUMNS: ConfigurableTableColumn<CompanyDocumentTableColumnId>[] =
  [
    {
      id: "title",
      label: "문서 종류",
      minWidth: 120,
      defaultWidth: 168,
      resizable: true,
    },
    {
      id: "file",
      label: "파일",
      minWidth: 120,
      defaultWidth: 192,
      resizable: true,
    },
    {
      id: "expires_at",
      label: "만료일",
      minWidth: 96,
      defaultWidth: 112,
      resizable: true,
    },
    {
      id: "created_at",
      label: "등록일",
      minWidth: 96,
      defaultWidth: 112,
      resizable: true,
    },
    {
      id: "created_by_name",
      label: "등록자",
      minWidth: 72,
      defaultWidth: 96,
      resizable: true,
    },
    {
      id: "delete",
      label: "삭제",
      minWidth: 72,
      defaultWidth: 88,
      resizable: false,
    },
  ];

export function getCompanyDocumentTableColumns(canManage: boolean) {
  if (canManage) return COMPANY_DOCUMENT_TABLE_COLUMNS;
  return COMPANY_DOCUMENT_TABLE_COLUMNS.filter((column) => column.id !== "delete");
}

export function getCompanyDocumentColumnOrderStorageKey(userId: string) {
  return `pc-company-documents-column-order-${userId}`;
}

export function getCompanyDocumentColumnWidthStorageKey(userId: string) {
  return `pc-company-documents-column-widths-${userId}`;
}
