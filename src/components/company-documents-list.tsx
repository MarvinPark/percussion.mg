"use client";

import { Fragment, useMemo } from "react";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import { useConfigurableTableColumns } from "@/hooks/use-configurable-table-columns";
import { isReorderableConfigurableColumn } from "@/lib/configurable-table-columns";
import {
  buildDocumentDownloadPath,
  formatCompanyDocumentExpiry,
  formatCompanyDocumentFileSize,
  isCompanyDocumentExpired,
} from "@/lib/company-documents";
import {
  getCompanyDocumentSortDirectionForColumn,
  isSortableCompanyDocumentColumn,
  type CompanyDocumentListSort,
  type CompanyDocumentSortColumn,
} from "@/lib/company-documents-sort";
import {
  getCompanyDocumentColumnOrderStorageKey,
  getCompanyDocumentColumnWidthStorageKey,
  getCompanyDocumentTableColumns,
  type CompanyDocumentTableColumnId,
} from "@/lib/company-documents-table-columns";
import {
  getTableHeaderPaddingClass,
  getTableRowPaddingClass,
} from "@/lib/table-row-preferences";
import type { CompanyDocument } from "@/types/company-document";

const deleteButtonClass =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60";

const clickableRowClass =
  "cursor-pointer transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800";

const tableClassName = "w-full table-fixed text-sm";

type CompanyDocumentsListProps = {
  userId: string;
  documents: CompanyDocument[];
  canManage: boolean;
  isPending: boolean;
  sort: CompanyDocumentListSort;
  rowFontSize?: number;
  onSortColumn: (column: CompanyDocumentSortColumn) => void;
  onDelete: (document: CompanyDocument) => void;
};

function formatCreatedAt(value: string) {
  return value.slice(0, 10);
}

function openDocument(document: CompanyDocument) {
  window.open(
    buildDocumentDownloadPath(document.id, document.file_name),
    "_blank",
    "noopener,noreferrer",
  );
}

function DocumentDeleteButton({
  document,
  canManage,
  isPending,
  onDelete,
}: {
  document: CompanyDocument;
  canManage: boolean;
  isPending: boolean;
  onDelete: (document: CompanyDocument) => void;
}) {
  if (!canManage) return null;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(document);
      }}
      className={deleteButtonClass}
    >
      삭제
    </button>
  );
}

function DocumentMobileCard({
  document,
  canManage,
  isPending,
  onDelete,
}: {
  document: CompanyDocument;
  canManage: boolean;
  isPending: boolean;
  onDelete: (document: CompanyDocument) => void;
}) {
  const expired = isCompanyDocumentExpired(document.expires_at);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => openDocument(document)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDocument(document);
        }
      }}
      className={
        expired
          ? `rounded-xl border border-zinc-200 bg-zinc-100/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/60 ${clickableRowClass}`
          : `rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900 ${clickableRowClass}`
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={
              expired
                ? "font-semibold text-zinc-600 dark:text-zinc-400"
                : "font-semibold text-zinc-900 dark:text-zinc-100"
            }
          >
            {document.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
            {document.file_name} ·{" "}
            {formatCompanyDocumentFileSize(document.file_size)}
          </p>
        </div>
        <DocumentDeleteButton
          document={document}
          canManage={canManage}
          isPending={isPending}
          onDelete={onDelete}
        />
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">만료일</dt>
          <dd
            className={
              expired
                ? "font-semibold text-red-600 dark:text-red-400"
                : "text-zinc-800 dark:text-zinc-200"
            }
          >
            {expired
              ? `만료 (${formatCompanyDocumentExpiry(document.expires_at)})`
              : formatCompanyDocumentExpiry(document.expires_at)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">등록일</dt>
          <dd className="text-zinc-800 dark:text-zinc-200">
            {formatCreatedAt(document.created_at)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">등록자</dt>
          <dd className="truncate text-zinc-800 dark:text-zinc-200">
            {document.created_by_name ?? "-"}
          </dd>
        </div>
      </dl>

      {document.note ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {document.note}
        </p>
      ) : null}
    </article>
  );
}

export default function CompanyDocumentsList({
  userId,
  documents,
  canManage,
  isPending,
  sort,
  rowFontSize = 12,
  onSortColumn,
  onDelete,
}: CompanyDocumentsListProps) {
  const columns = useMemo(
    () => getCompanyDocumentTableColumns(canManage),
    [canManage],
  );
  const rowPaddingClass = getTableRowPaddingClass(rowFontSize);
  const headerPaddingClass = getTableHeaderPaddingClass(rowFontSize);
  const cellClass = `max-w-0 truncate whitespace-nowrap px-4 text-zinc-900 dark:text-zinc-100 ${rowPaddingClass}`;
  const headerClass = `whitespace-nowrap px-4 ${headerPaddingClass} text-xs font-semibold`;
  const subFontSize = Math.max(8, rowFontSize - 2);

  const {
    orderedColumns,
    widths,
    startResize,
    tableMinWidth,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
    shouldIgnoreSortClick,
    shouldIgnoreHeaderClick,
    fixedStart,
    fixedEnd,
  } = useConfigurableTableColumns(
    userId,
    getCompanyDocumentColumnOrderStorageKey(userId),
    getCompanyDocumentColumnWidthStorageKey(userId),
    columns,
    { fixedEnd: canManage ? ["delete"] : [] },
  );

  function getHeaderDragProps(columnId: CompanyDocumentTableColumnId) {
    if (!isReorderableConfigurableColumn(columnId, fixedStart, fixedEnd)) {
      return {};
    }

    return {
      reorderable: true,
      isDragging: draggingColumnId === columnId,
      isDragOver: dragOverColumnId === columnId,
      onColumnDragStart: handleColumnDragStart,
      onColumnDragEnd: handleColumnDragEnd,
      onColumnDragOver: handleColumnDragOver,
      onColumnDrop: handleColumnDrop,
    };
  }

  function renderCell(
    columnId: CompanyDocumentTableColumnId,
    document: CompanyDocument,
    expired: boolean,
  ) {
    switch (columnId) {
      case "title":
        return (
          <td className={`px-4 ${rowPaddingClass} font-medium`}>
            <div className="truncate">{document.title}</div>
            {document.note ? (
              <p
                className="mt-1 truncate text-zinc-500 dark:text-zinc-400"
                style={{ fontSize: `${subFontSize}px` }}
              >
                {document.note}
              </p>
            ) : null}
          </td>
        );
      case "file":
        return (
          <td className={`px-4 ${rowPaddingClass}`}>
            <div className="truncate">{document.file_name}</div>
            <p
              className="mt-1 truncate text-zinc-500 dark:text-zinc-400"
              style={{ fontSize: `${subFontSize}px` }}
            >
              {formatCompanyDocumentFileSize(document.file_size)}
            </p>
          </td>
        );
      case "expires_at":
        return (
          <td className={cellClass}>
            {expired ? (
              <span className="font-semibold text-red-600 dark:text-red-400">
                만료 ({formatCompanyDocumentExpiry(document.expires_at)})
              </span>
            ) : (
              formatCompanyDocumentExpiry(document.expires_at)
            )}
          </td>
        );
      case "created_at":
        return (
          <td className={cellClass}>{formatCreatedAt(document.created_at)}</td>
        );
      case "created_by_name":
        return (
          <td className={cellClass}>{document.created_by_name ?? "-"}</td>
        );
      case "delete":
        return (
          <td
            className={`px-4 ${rowPaddingClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            <DocumentDeleteButton
              document={document}
              canManage={canManage}
              isPending={isPending}
              onDelete={onDelete}
            />
          </td>
        );
      default:
        return null;
    }
  }

  const colGroup = (
    <colgroup>
      {orderedColumns.map((column) => (
        <col key={column.id} style={{ width: `${widths[column.id]}px` }} />
      ))}
    </colgroup>
  );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            등록된 문서가 없습니다.
          </div>
        ) : (
          documents.map((document) => (
            <DocumentMobileCard
              key={document.id}
              document={document}
              canManage={canManage}
              isPending={isPending}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block dark:border-zinc-700">
        <table className={tableClassName} style={{ minWidth: tableMinWidth }}>
          {colGroup}
          <thead
            className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200"
            style={{ fontSize: `${rowFontSize}px` }}
          >
            <tr>
              {orderedColumns.map((column) => {
                const sortColumn = isSortableCompanyDocumentColumn(column.id)
                  ? column.id
                  : null;

                return (
                  <DraggableTableHeaderCell
                    key={column.id}
                    columnId={column.id}
                    label={column.label}
                    align={column.align ?? "left"}
                    className={headerClass}
                    resizable={column.resizable}
                    onResizeStart={startResize}
                    sortable={sortColumn !== null}
                    sortDirection={
                      sortColumn
                        ? getCompanyDocumentSortDirectionForColumn(sort, sortColumn)
                        : null
                    }
                    onSortClick={() => {
                      if (
                        !sortColumn ||
                        shouldIgnoreSortClick() ||
                        shouldIgnoreHeaderClick()
                      ) {
                        return;
                      }
                      onSortColumn(sortColumn);
                    }}
                    {...getHeaderDragProps(column.id)}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody style={{ fontSize: `${rowFontSize}px` }}>
            {documents.length === 0 ? (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  등록된 문서가 없습니다.
                </td>
              </tr>
            ) : (
              documents.map((document) => {
                const expired = isCompanyDocumentExpired(document.expires_at);
                return (
                  <tr
                    key={document.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDocument(document)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDocument(document);
                      }
                    }}
                    className={
                      expired
                        ? `border-b border-zinc-100 bg-zinc-100/90 text-zinc-500 last:border-0 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 ${clickableRowClass}`
                        : `border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${clickableRowClass}`
                    }
                  >
                    {orderedColumns.map((column) => (
                      <Fragment key={column.id}>
                        {renderCell(column.id, document, expired)}
                      </Fragment>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
