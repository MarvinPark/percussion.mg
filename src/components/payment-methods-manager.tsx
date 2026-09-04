"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods,
  updatePaymentMethod,
} from "@/app/(main)/sales/payment-methods/actions";
import { sortPaymentMethods } from "@/lib/payment-methods";
import type { PaymentMethod } from "@/types/sale";

const compactBtnClass =
  "rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

const reorderBtnClass =
  "inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

const compactDeleteBtnClass =
  "rounded px-2 py-0.5 text-xs text-red-600 hover:underline dark:text-red-400";

const compactInputClass =
  "w-full rounded border border-zinc-400 bg-white px-2 py-0.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const compactRowClass = "px-3 py-0.5";
const defaultRowClass = "px-6 py-2";

type ReorderAction = "up" | "down" | "top" | "bottom";

function reorderSelectedMethods(
  methods: PaymentMethod[],
  selectedIds: Set<string>,
  action: ReorderAction,
): PaymentMethod[] | null {
  if (!selectedIds.size) return null;

  const sorted = sortPaymentMethods(methods);
  const reordered = [...sorted];

  if (action === "top") {
    const selected = reordered.filter((method) => selectedIds.has(method.id));
    const unselected = reordered.filter((method) => !selectedIds.has(method.id));
    return [...selected, ...unselected];
  }

  if (action === "bottom") {
    const selected = reordered.filter((method) => selectedIds.has(method.id));
    const unselected = reordered.filter((method) => !selectedIds.has(method.id));
    return [...unselected, ...selected];
  }

  if (action === "up") {
    let moved = false;
    for (let index = 1; index < reordered.length; index += 1) {
      if (
        selectedIds.has(reordered[index].id) &&
        !selectedIds.has(reordered[index - 1].id)
      ) {
        [reordered[index - 1], reordered[index]] = [
          reordered[index],
          reordered[index - 1],
        ];
        moved = true;
      }
    }
    return moved ? reordered : null;
  }

  let moved = false;
  for (let index = reordered.length - 2; index >= 0; index -= 1) {
    if (
      selectedIds.has(reordered[index].id) &&
      !selectedIds.has(reordered[index + 1].id)
    ) {
      [reordered[index], reordered[index + 1]] = [
        reordered[index + 1],
        reordered[index],
      ];
      moved = true;
    }
  }
  return moved ? reordered : null;
}

function canMoveSelected(
  methods: PaymentMethod[],
  selectedIds: Set<string>,
  action: "up" | "down",
) {
  const sorted = sortPaymentMethods(methods);
  if (action === "up") {
    return sorted.some(
      (method, index) =>
        index > 0 &&
        selectedIds.has(method.id) &&
        !selectedIds.has(sorted[index - 1].id),
    );
  }

  return sorted.some(
    (method, index) =>
      index < sorted.length - 1 &&
      selectedIds.has(method.id) &&
      !selectedIds.has(sorted[index + 1].id),
  );
}

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type PaymentMethodsManagerProps = {
  paymentMethods: PaymentMethod[];
  embedded?: boolean;
};

export default function PaymentMethodsManager({
  paymentMethods,
  embedded = false,
}: PaymentMethodsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFeeRate, setEditFeeRate] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const sortedMethods = sortPaymentMethods(paymentMethods);
  const hasSelection = selectedIds.size > 0;
  const canMoveUp = canMoveSelected(paymentMethods, selectedIds, "up");
  const canMoveDown = canMoveSelected(paymentMethods, selectedIds, "down");

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await createPaymentMethod(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setMessage("결제 수단이 추가되었습니다.");
    refresh();
  }

  async function handleUpdate(id: string) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("name", editName);
    formData.set("fee_rate", String(editFeeRate));

    const result = await updatePaymentMethod(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setEditingId(null);
    setMessage("결제 수단이 수정되었습니다.");
    refresh();
  }

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleReorderSelected(action: ReorderAction) {
    const reordered = reorderSelectedMethods(paymentMethods, selectedIds, action);
    if (!reordered) return;

    setError(null);
    setMessage(null);
    const result = await reorderPaymentMethods(reordered.map((method) => method.id));
    if (result?.error) {
      setError(result.error);
      return;
    }

    setMessage("순서가 변경되었습니다.");
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 결제 수단을 삭제할까요?`)) return;

    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("id", id);

    const result = await deletePaymentMethod(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setMessage("결제 수단이 삭제되었습니다.");
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    refresh();
  }

  function startEdit(method: PaymentMethod) {
    setEditingId(method.id);
    setEditName(method.name);
    setEditFeeRate(method.fee_rate);
    setError(null);
    setMessage(null);
  }

  const rowClass = embedded ? compactRowClass : defaultRowClass;
  const headerClass = embedded
    ? "flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-800/50"
    : "flex items-center justify-between gap-3 border-b border-zinc-200 px-6 py-2.5 dark:border-zinc-700";

  return (
    <div className="space-y-6">
      <section
        className={
          embedded
            ? "space-y-4"
            : "rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        }
      >
        {!embedded ? (
          <>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              결제 수단 추가
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              이름과 수수료율(%)을 입력하세요. 견적·매출 화면에서 바로 선택할 수
              있습니다.
            </p>
          </>
        ) : (
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            결제 수단 추가
          </h4>
        )}

        <form
          action={handleCreate}
          className="mt-4 grid gap-3"
        >
          <div>
            <label htmlFor="name" className={labelClass}>
              결제 수단 이름
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="예: 네이버페이"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fee_rate" className={labelClass}>
              수수료 (%)
            </label>
            <input
              id="fee_rate"
              name="fee_rate"
              type="number"
              min={0}
              step={0.1}
              defaultValue={0}
              required
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              추가
            </button>
          </div>
        </form>
      </section>

      {message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section
        className={
          embedded
            ? "overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
            : "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }
      >
        <div className={headerClass}>
          <h3
            className={
              embedded
                ? "text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                : "text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            }
          >
            등록된 결제 수단
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleReorderSelected("up")}
              disabled={isPending || !hasSelection || !canMoveUp}
              className={reorderBtnClass}
              aria-label="선택 항목 위로"
              title="위로"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => void handleReorderSelected("down")}
              disabled={isPending || !hasSelection || !canMoveDown}
              className={reorderBtnClass}
              aria-label="선택 항목 아래로"
              title="아래로"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => void handleReorderSelected("top")}
              disabled={isPending || !hasSelection}
              className={reorderBtnClass}
              aria-label="선택 항목 맨 위로"
              title="맨 위"
            >
              ⏫
            </button>
            <button
              type="button"
              onClick={() => void handleReorderSelected("bottom")}
              disabled={isPending || !hasSelection}
              className={reorderBtnClass}
              aria-label="선택 항목 맨 아래로"
              title="맨 아래"
            >
              ⏬
            </button>
          </div>
        </div>

        {!paymentMethods.length ? (
          <p className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400">
            등록된 결제 수단이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortedMethods.map((method) => (
              <li key={method.id} className={rowClass}>
                {editingId === method.id ? (
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className={`w-full ${embedded ? compactInputClass : inputClass}`}
                      aria-label="결제 수단 이름"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editFeeRate}
                      onChange={(event) =>
                        setEditFeeRate(Number(event.target.value) || 0)
                      }
                      className={`w-full ${embedded ? compactInputClass : inputClass}`}
                      aria-label="수수료"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(method.id)}
                      disabled={isPending}
                      className="rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className={compactBtnClass}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(method.id)}
                      onChange={(event) =>
                        toggleSelection(method.id, event.target.checked)
                      }
                      className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300"
                      aria-label={`${method.name} 선택`}
                    />
                    <p className="text-xs leading-tight text-zinc-900 dark:text-zinc-100 sm:text-sm">
                      <span className="font-semibold">{method.name}</span>
                      <span className="mx-1 text-zinc-400">·</span>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        수수료 {method.fee_rate}%
                      </span>
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(method)}
                        className={compactBtnClass}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(method.id, method.name)}
                        className={compactDeleteBtnClass}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
