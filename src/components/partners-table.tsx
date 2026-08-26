"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { updatePartnerMemo } from "@/app/(main)/partners/actions";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import TablePageSizeSelect from "@/components/table-page-size-select";
import { usePartnersColumnWidths } from "@/hooks/use-partners-column-widths";
import { useTableColumnOrder } from "@/hooks/use-table-column-order";
import { formatRegNum } from "@/lib/business-partners";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import {
  loadPartnersEmphasizedIds,
  savePartnersEmphasizedIds,
} from "@/lib/partners-list-preferences";
import {
  getDefaultPartnersColumnOrder,
  getPartnersBaseColumns,
  getPartnersColumnOrderStorageKey,
  isReorderablePartnersColumn,
  PARTNERS_FIXED_END_COLUMN_IDS,
  type PartnersTableColumnId,
} from "@/lib/partners-table-columns";
import {
  getPartnersTableHeaderPaddingClass,
  getPartnersTableRowPaddingClass,
} from "@/lib/table-row-preferences";
import type { TablePageSize } from "@/lib/table-page-size";
import type { BusinessPartner } from "@/types/business-partner";

const emphasizeCellClass = "w-10 px-2 text-center";

const emphasizedRowClass =
  "bg-red-50/90 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/40";

const tableClassName = "w-full table-fixed text-sm";

const inlineMemoInputClass =
  "w-full min-w-0 border-0 bg-transparent px-0 py-0 text-inherit shadow-none outline-none ring-0 focus:border-0 focus:ring-0 dark:bg-transparent";

const editableMemoCellClass =
  "max-w-0 cursor-text whitespace-nowrap px-3 leading-normal";

function PartnerInlineMemoCell({
  partnerId,
  value,
  disabled,
  rowFontSize,
  onSaved,
  onSaveError,
}: {
  partnerId: string;
  value: string | null;
  disabled?: boolean;
  rowFontSize: number;
  onSaved: (partnerId: string, memo: string | null) => void;
  onSaveError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? "");
    }
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  async function save() {
    const normalized = draft.trim() || null;
    const original = value?.trim() || null;

    if (normalized === original) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setSaveError(null);
    const result = await updatePartnerMemo(partnerId, normalized);
    setSaving(false);

    if (result.error) {
      setSaveError(result.error);
      onSaveError(result.error);
      setDraft(value ?? "");
      setEditing(false);
      return;
    }

    onSaved(partnerId, result.memo ?? normalized);
    setEditing(false);
  }

  if (editing && !disabled) {
    return (
      <input
        ref={inputRef}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        className={inlineMemoInputClass}
        style={{ fontSize: `${rowFontSize}px` }}
        aria-label="메모"
      />
    );
  }

  return (
    <span
      className={`block truncate ${disabled ? "" : "cursor-text"}`}
      title={value ?? undefined}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!disabled) {
          setSaveError(null);
          setEditing(true);
        }
      }}
    >
      {saveError ? (
        <span className="truncate text-red-600 dark:text-red-400" title={saveError}>
          {saveError}
        </span>
      ) : (
        value || "-"
      )}
    </span>
  );
}

function PartnerEmphasisToggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 transition ${
        checked
          ? "border-red-500 bg-red-500 text-white"
          : "border-zinc-300 bg-white hover:border-red-300 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-red-400"
      }`}
    >
      {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
    </button>
  );
}

type PartnersTableProps = {
  userId: string;
  partners: BusinessPartner[];
  totalCount: number;
  canManage: boolean;
  rowFontSize?: number;
  emptyMessage?: string;
  pageSize: TablePageSize;
  onPageSizeChange: (value: TablePageSize) => void;
};

export default function PartnersTable({
  userId,
  partners,
  totalCount,
  canManage,
  rowFontSize = 12,
  emptyMessage,
  pageSize,
  onPageSizeChange,
}: PartnersTableProps) {
  const router = useRouter();
  const [emphasizedIds, setEmphasizedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [emphasisLoaded, setEmphasisLoaded] = useState(false);
  const [memoOverrides, setMemoOverrides] = useState<
    Record<string, string | null>
  >({});
  const [memoSaveError, setMemoSaveError] = useState<string | null>(null);

  const partnerIdsKey = useMemo(
    () => partners.map((partner) => partner.id).join("|"),
    [partners],
  );

  useEffect(() => {
    setMemoOverrides({});
  }, [partnerIdsKey]);

  useEffect(() => {
    setEmphasizedIds(loadPartnersEmphasizedIds(userId));
    setEmphasisLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!emphasisLoaded) return;
    savePartnersEmphasizedIds(userId, emphasizedIds);
  }, [emphasisLoaded, emphasizedIds, userId]);

  const baseColumns = useMemo(
    () => getPartnersBaseColumns(canManage),
    [canManage],
  );
  const defaultOrder = useMemo(
    () => getDefaultPartnersColumnOrder(canManage),
    [canManage],
  );
  const {
    orderedColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  } = useTableColumnOrder(
    getPartnersColumnOrderStorageKey(userId),
    defaultOrder,
    baseColumns,
    { fixedEnd: PARTNERS_FIXED_END_COLUMN_IDS },
  );
  const { widths, startResize } = usePartnersColumnWidths(userId);

  const displayPartners = useMemo(
    () =>
      partners.map((partner) => ({
        ...partner,
        memo:
          partner.id in memoOverrides ? memoOverrides[partner.id] : partner.memo,
      })),
    [memoOverrides, partners],
  );

  const cellPaddingClass = getPartnersTableRowPaddingClass(rowFontSize);
  const headerPaddingClass = getPartnersTableHeaderPaddingClass(rowFontSize);
  const cellClass = `max-w-0 truncate whitespace-nowrap px-3 ${cellPaddingClass} leading-normal`;
  const headerClass = `whitespace-nowrap px-3 ${headerPaddingClass} text-xs font-semibold`;
  const tableMinWidth =
    orderedColumns.reduce((sum, column) => sum + widths[column.id], 0) + 40;
  const tableStyle = { minWidth: tableMinWidth };

  const colGroup = (
    <colgroup>
      <col style={{ width: "40px" }} />
      {orderedColumns.map((column) => (
        <col key={column.id} style={{ width: `${widths[column.id]}px` }} />
      ))}
    </colgroup>
  );

  function getHeaderDragProps(columnId: PartnersTableColumnId) {
    if (!isReorderablePartnersColumn(columnId)) {
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

  function toggleEmphasis(id: string, checked: boolean) {
    setEmphasizedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function renderPartnerCell(
    columnId: PartnersTableColumnId,
    partner: BusinessPartner,
  ) {
    switch (columnId) {
      case "display_name":
        return (
          <td
            className={`${cellClass} font-medium text-zinc-900 dark:text-zinc-100`}
          >
            {partner.corp_name || partner.display_name}
          </td>
        );
      case "corp_num":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {formatRegNum(partner.corp_num, partner.partner_type)}
          </td>
        );
      case "ceo_name":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {partner.ceo_name || "-"}
          </td>
        );
      case "phone":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {formatPhoneForDisplay(partner.contact_phone) || "-"}
          </td>
        );
      case "email":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {partner.invoice_email || partner.contact_email || "-"}
          </td>
        );
      case "address":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {partner.invoice_address || partner.contact_address || "-"}
          </td>
        );
      case "biz_type":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {partner.biz_type || "-"}
          </td>
        );
      case "biz_class":
        return (
          <td className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
            {partner.biz_class || "-"}
          </td>
        );
      case "memo":
        return (
          <td
            className={`${
              canManage ? editableMemoCellClass : cellClass
            } ${cellPaddingClass} text-zinc-600 dark:text-zinc-400`}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <PartnerInlineMemoCell
              partnerId={partner.id}
              value={partner.memo}
              disabled={!canManage}
              rowFontSize={rowFontSize}
              onSaved={(partnerId, memo) => {
                setMemoSaveError(null);
                setMemoOverrides((current) => ({
                  ...current,
                  [partnerId]: memo,
                }));
                router.refresh();
              }}
              onSaveError={setMemoSaveError}
            />
          </td>
        );
      case "actions":
        return (
          <td className={`${cellClass} text-right`}>
            <Link
              href={`/partners/${partner.id}/edit`}
              className="font-medium text-blue-700 hover:underline dark:text-blue-300"
              style={{ fontSize: `${Math.max(9, rowFontSize - 1)}px` }}
            >
              {canManage ? "수정" : "보기"}
            </Link>
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          거래처 목록
        </span>
        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
          {totalCount}건
        </span>
        <div className="ml-auto">
          <TablePageSizeSelect
            value={pageSize}
            onChange={onPageSizeChange}
            compact
          />
        </div>
      </div>

      {memoSaveError ? (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {memoSaveError}
        </div>
      ) : null}

      <table className={tableClassName} style={tableStyle}>
        {colGroup}
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <tr>
            <th
              className={`${emphasizeCellClass} ${headerPaddingClass} text-[11px] font-semibold text-zinc-700 dark:text-zinc-300`}
            >
              표시
            </th>
            {orderedColumns.map((column) => (
              <DraggableTableHeaderCell
                key={column.id}
                columnId={column.id}
                label={column.label}
                align={column.align ?? "left"}
                className={headerClass}
                resizable={column.resizable}
                onResizeStart={startResize}
                {...getHeaderDragProps(column.id)}
              />
            ))}
          </tr>
        </thead>
        <tbody style={{ fontSize: `${rowFontSize}px` }}>
          {partners.length === 0 ? (
            <tr>
              <td
                colSpan={orderedColumns.length + 1}
                className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
              >
                {emptyMessage ?? "등록된 거래처가 없습니다."}
              </td>
            </tr>
          ) : null}
          {displayPartners.map((partner) => {
            const isEmphasized = emphasizedIds.has(partner.id);

            return (
              <tr
                key={partner.id}
                className={`border-b border-zinc-100 transition last:border-0 dark:border-zinc-800 ${
                  isEmphasized
                    ? emphasizedRowClass
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <td className={`${emphasizeCellClass} ${cellPaddingClass}`}>
                  <PartnerEmphasisToggle
                    checked={isEmphasized}
                    onChange={(checked) => toggleEmphasis(partner.id, checked)}
                    ariaLabel={`${partner.display_name} 강조`}
                  />
                </td>
                {orderedColumns.map((column) => (
                  <Fragment key={`${partner.id}-${column.id}`}>
                    {renderPartnerCell(column.id, partner)}
                  </Fragment>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
