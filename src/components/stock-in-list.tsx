"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStockInMovements,
  updateStockInMovement,
} from "@/app/(main)/products/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import ProductSearchSelect from "@/components/product-search-select";
import type { SaleProductOption } from "@/types/sale";
import type { StockMovementWithProduct } from "@/types/stock-movement";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string | null, fallbackCreatedAt: string) {
  if (value) {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(`${value}T00:00:00`));
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(fallbackCreatedAt));
}

type EditingField = "product" | "quantity";

type EditingCell = {
  id: string;
  field: EditingField;
};

type StockInListProps = {
  movements: StockMovementWithProduct[];
  canManage?: boolean;
};

const cellClass =
  "whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100";
const editableCellClass =
  "cursor-text whitespace-nowrap bg-sky-50/80 px-4 py-3 text-zinc-900 hover:bg-sky-100/80 dark:bg-sky-950/25 dark:text-zinc-100 dark:hover:bg-sky-950/40";
const inputClass =
  "w-full min-w-[5rem] rounded border border-blue-400 bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100";
const deleteButtonClass =
  "rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400";

export default function StockInList({
  movements,
  canManage = true,
}: StockInListProps) {
  const router = useRouter();
  const skipBlurSaveRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [draftProduct, setDraftProduct] = useState<SaleProductOption | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const allSelected =
    movements.length > 0 && selectedIds.size === movements.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedCount = selectedIds.size;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(movements.map((item) => item.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function beginEdit(item: StockMovementWithProduct, field: EditingField) {
    if (!canManage || isSaving) return;

    setError(null);
    setEditingCell({ id: item.id, field });

    if (field === "product") {
      setDraftProduct(
        item.products
          ? {
              id: item.product_id,
              product_name: item.products.product_name,
              model_name: item.products.model_name,
              sku: item.products.sku,
              supplier: item.products.supplier,
              sale_price: 0,
              purchase_price: 0,
              stock_quantity: 0,
            }
          : null,
      );
      return;
    }

    setDraftValue(String(item.quantity));
  }

  function cancelEdit() {
    setEditingCell(null);
    setDraftValue("");
    setDraftProduct(null);
  }

  function saveQuantity(movementId: string, value: string) {
    startSave(async () => {
      setError(null);
      const result = await updateStockInMovement(movementId, "quantity", value);
      if (result.error) {
        setError(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function saveProduct(movementId: string, productId: string) {
    startSave(async () => {
      setError(null);
      const result = await updateStockInMovement(
        movementId,
        "product_id",
        productId,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTargetIds?.length) return;

    startDelete(async () => {
      setError(null);
      const result = await deleteStockInMovements(deleteTargetIds);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeleteTargetIds(null);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  const toolbar = canManage ? (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={selectedCount === 0 || isDeleting || isSaving}
        onClick={() => setDeleteTargetIds([...selectedIds])}
        className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
      >
        삭제{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </button>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        모델명·수량 칸을 더블클릭하면 수정할 수 있습니다.
      </p>
    </div>
  ) : null;

  const tableRows = movements.map((item) => {
    const isEditing = (field: EditingField) =>
      editingCell?.id === item.id && editingCell.field === field;

    return (
      <tr
        key={item.id}
        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
      >
        {canManage ? (
          <td className="px-3 py-3">
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={(event) => toggleOne(item.id, event.target.checked)}
              aria-label={`${item.products?.model_name ?? "입고"} 선택`}
            />
          </td>
        ) : null}
        <td className={cellClass}>
          {formatDate(item.movement_date, item.created_at)}
        </td>
        <td className={cellClass}>{formatTime(item.created_at)}</td>
        <td className={cellClass}>{item.modified_by_name ?? "-"}</td>
        <td className={cellClass}>{item.products?.supplier ?? "-"}</td>
        <td className={cellClass}>
          {item.products?.product_name ?? "삭제된 제품"}
        </td>
        <td
          className={canManage ? editableCellClass : cellClass}
          onDoubleClick={() => beginEdit(item, "product")}
        >
          {isEditing("product") ? (
            <ProductSearchSelect
              selectedProduct={draftProduct}
              onSelect={(product) => {
                if (!product) {
                  setDraftProduct(null);
                  return;
                }
                setDraftProduct(product);
                saveProduct(item.id, product.id);
              }}
              onCancel={cancelEdit}
              compact
              modelNameOnly
              emphasizeModelName
              showHiddenField={false}
              showHelperText={false}
              inputId={`stock_in_product_${item.id}`}
            />
          ) : (
            <span className="font-medium">
              {item.products?.model_name ?? "-"}
            </span>
          )}
        </td>
        <td
          className={canManage ? editableCellClass : cellClass}
          onDoubleClick={() => beginEdit(item, "quantity")}
        >
          {isEditing("quantity") ? (
            <input
              type="number"
              min={1}
              value={draftValue}
              autoFocus
              disabled={isSaving}
              onChange={(event) => setDraftValue(event.target.value)}
              onBlur={() => {
                if (skipBlurSaveRef.current) {
                  skipBlurSaveRef.current = false;
                  return;
                }
                saveQuantity(item.id, draftValue);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  skipBlurSaveRef.current = true;
                  cancelEdit();
                }
              }}
              className={`${inputClass} w-20`}
            />
          ) : (
            `${item.quantity}개`
          )}
        </td>
        {canManage ? (
          <td className="px-3 py-3">
            <button
              type="button"
              disabled={isDeleting || isSaving}
              onClick={() => setDeleteTargetIds([item.id])}
              className={deleteButtonClass}
              aria-label="삭제"
            >
              -
            </button>
          </td>
        ) : null}
      </tr>
    );
  });

  return (
    <>
      {toolbar}

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="space-y-3 md:hidden">
        {movements.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {canManage ? (
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={(event) => toggleOne(item.id, event.target.checked)}
                />
                선택
              </label>
            ) : null}
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {item.products?.model_name ?? "-"}
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {item.products?.product_name ?? "삭제된 제품"}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  입고일
                </dt>
                <dd>{formatDate(item.movement_date, item.created_at)}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  기록 시각
                </dt>
                <dd>{formatTime(item.created_at)}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  기록자
                </dt>
                <dd>{item.modified_by_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  공급처
                </dt>
                <dd>{item.products?.supplier ?? "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  수량
                </dt>
                <dd>{item.quantity}개</dd>
              </div>
            </dl>
            {canManage ? (
              <button
                type="button"
                disabled={isDeleting || isSaving}
                onClick={() => setDeleteTargetIds([item.id])}
                className={`${deleteButtonClass} mt-3`}
              >
                삭제
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white md:block dark:border-zinc-700 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              {canManage ? (
                <th className="px-3 py-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(event) => toggleAll(event.target.checked)}
                    aria-label="전체 선택"
                  />
                </th>
              ) : null}
              <th className="px-4 py-3 font-semibold">입고일</th>
              <th className="px-4 py-3 font-semibold">기록 시각</th>
              <th className="px-4 py-3 font-semibold">기록자</th>
              <th className="px-4 py-3 font-semibold">공급처</th>
              <th className="px-4 py-3 font-semibold">제품명</th>
              <th className="px-4 py-3 font-semibold">모델명</th>
              <th className="px-4 py-3 font-semibold">수량</th>
              {canManage ? (
                <th className="px-3 py-3 font-semibold" aria-label="삭제" />
              ) : null}
            </tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </table>
      </div>

      {deleteTargetIds ? (
        <DeleteConfirmDialog
          count={deleteTargetIds.length}
          onCancel={() => {
            if (!isDeleting) setDeleteTargetIds(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}
