"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOverheadExpense,
  deleteOverheadExpense,
  updateOverheadExpense,
} from "@/app/(main)/settings/overhead/actions";
import ConfirmDialog from "@/components/confirm-dialog";
import OverheadCategoryAutocomplete from "@/components/overhead-category-autocomplete";
import OverheadGroupChart from "@/components/overhead-group-chart";
import OverheadProfitSummary from "@/components/overhead-profit-summary";
import PriceInput from "@/components/price-input";
import {
  buildGroupChartData,
  formatAccrualMonthLabel,
} from "@/lib/overhead-expenses";
import { formatKRW } from "@/lib/sales-calculator";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import type { OverheadProfitInsights } from "@/lib/overhead-profit-insights";
import type {
  OverheadCategory,
  OverheadExpenseWithCategory,
} from "@/types/overhead";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass = "mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300";

type OverheadExpensesManagerProps = {
  categories: OverheadCategory[];
  expenses: OverheadExpenseWithCategory[];
  initialMonth: string;
  defaultExpenseDate: string;
  schemaError?: string | null;
  profitInsights: OverheadProfitInsights;
};

type ExpenseDraft = {
  category_id: string;
  expense_date: string;
  accrual_month: string;
  amount: number;
  memo: string;
};

function formatDateLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function buildDraft(
  expenseDate: string,
  month: string,
  expense?: OverheadExpenseWithCategory,
): ExpenseDraft {
  return {
    category_id: expense?.category_id ?? "",
    expense_date: expense?.expense_date ?? expenseDate,
    accrual_month: expense?.accrual_month.slice(0, 7) ?? month,
    amount: expense?.amount ?? 0,
    memo: expense?.memo ?? "",
  };
}

export default function OverheadExpensesManager({
  categories,
  expenses,
  initialMonth,
  defaultExpenseDate,
  schemaError,
  profitInsights,
}: OverheadExpensesManagerProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [message, setMessage] = useState<string | null>(schemaError ?? null);
  const [createDraft, setCreateDraft] = useState<ExpenseDraft>(() =>
    buildDraft(defaultExpenseDate, initialMonth),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ExpenseDraft | null>(null);
  const [deletingExpense, setDeletingExpense] =
    useState<OverheadExpenseWithCategory | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [isUpdating, startUpdate] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const chartSummaries = useMemo(
    () => buildGroupChartData(categories, expenses),
    [categories, expenses],
  );

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    setCreateDraft((current) => ({
      ...current,
      accrual_month: nextMonth,
    }));
    router.push(`/settings/overhead?month=${nextMonth}`);
  }

  function startEditing(expense: OverheadExpenseWithCategory) {
    setEditingId(expense.id);
    setEditDraft(buildDraft(defaultExpenseDate, month, expense));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {message}
        </p>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,15rem)]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
          <label htmlFor="overhead_month" className={labelClass}>
            귀속월
          </label>
          <input
            id="overhead_month"
            type="month"
            value={month}
            onChange={(event) => handleMonthChange(event.target.value)}
            className={`${inputClass} max-w-full`}
          />
          <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {formatAccrualMonthLabel(`${month}-01`)} 합계
          </p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatKRW(totalAmount)}원
          </p>
        </div>

        <div className="min-w-0 overflow-hidden">
          <OverheadGroupChart
            month={month}
            summaries={chartSummaries}
            onMonthChange={handleMonthChange}
          />
        </div>

        <div className="min-w-0 overflow-hidden">
          <OverheadProfitSummary
          month={month}
          totalSales={profitInsights.totalSales}
          totalProfit={profitInsights.totalProfit}
          overheadTotal={totalAmount}
          salesCount={profitInsights.salesCount}
          salesComparison={profitInsights.salesComparison}
          salesCountComparison={profitInsights.salesCountComparison}
          operatingProfitComparison={profitInsights.operatingProfitComparison}
        />
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
          판관비 등록
        </h3>
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          action={(formData) => {
            setMessage(null);
            formData.set("category_id", createDraft.category_id);
            formData.set("amount", String(createDraft.amount));
            startCreate(async () => {
              const result = await createOverheadExpense(formData);
              if (result?.error) {
                setMessage(result.error);
                return;
              }
              setCreateDraft(buildDraft(defaultExpenseDate, month));
              router.refresh();
            });
          }}
        >
          <div>
            <label htmlFor="create_category_id" className={labelClass}>
              항목
            </label>
            <OverheadCategoryAutocomplete
              id="create_category_id"
              categories={categories}
              categoryId={createDraft.category_id}
              onCategoryChange={(categoryId) =>
                setCreateDraft((current) => ({
                  ...current,
                  category_id: categoryId,
                }))
              }
              className={inputClass}
              required
            />
            <input type="hidden" name="category_id" value={createDraft.category_id} />
          </div>
          <div>
            <label htmlFor="create_expense_date" className={labelClass}>
              발생일
            </label>
            <input
              id="create_expense_date"
              name="expense_date"
              type="date"
              value={createDraft.expense_date}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  expense_date: event.target.value,
                }))
              }
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="create_accrual_month" className={labelClass}>
              귀속월
            </label>
            <input
              id="create_accrual_month"
              name="accrual_month"
              type="month"
              value={createDraft.accrual_month}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  accrual_month: event.target.value,
                }))
              }
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="create_amount" className={labelClass}>
              금액
            </label>
            <PriceInput
              id="create_amount"
              name="amount"
              value={createDraft.amount}
              onChange={(amount) =>
                setCreateDraft((current) => ({ ...current, amount }))
              }
              className={inputClass}
              required
            />
          </div>
          <div className="md:col-span-2 xl:col-span-1">
            <label htmlFor="create_memo" className={labelClass}>
              메모
            </label>
            <input
              id="create_memo"
              name="memo"
              value={createDraft.memo}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  memo: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="선택"
            />
          </div>
          <div className="flex items-end md:col-span-2 xl:col-span-5">
            <button
              type="submit"
              disabled={isCreating || categories.length === 0}
              className={`${btnPrimary} px-4 py-2.5`}
            >
              {isCreating ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {formatAccrualMonthLabel(`${month}-01`)} 내역
          </h3>
        </div>
        {expenses.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            등록된 판관비가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-2.5">발생일</th>
                  <th className="px-4 py-2.5">대분류</th>
                  <th className="px-4 py-2.5">세부항목</th>
                  <th className="px-4 py-2.5 text-right">금액</th>
                  <th className="px-4 py-2.5">메모</th>
                  <th className="px-4 py-2.5">입력</th>
                  <th className="px-4 py-2.5 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const isEditing = editingId === expense.id && editDraft;

                  if (isEditing) {
                    return (
                      <tr
                        key={expense.id}
                        className="border-t border-zinc-200 bg-blue-50/40 dark:border-zinc-700 dark:bg-blue-950/20"
                      >
                        <td className="px-4 py-3">
                          <input
                            name="expense_date"
                            type="date"
                            value={editDraft.expense_date}
                            onChange={(event) =>
                              setEditDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      expense_date: event.target.value,
                                    }
                                  : current,
                              )
                            }
                            className={inputClass}
                          />
                        </td>
                        <td className="px-4 py-3" colSpan={2}>
                          <OverheadCategoryAutocomplete
                            id={`edit_category_${expense.id}`}
                            categories={categories}
                            categoryId={editDraft.category_id}
                            onCategoryChange={(categoryId) =>
                              setEditDraft((current) =>
                                current
                                  ? { ...current, category_id: categoryId }
                                  : current,
                              )
                            }
                            className={inputClass}
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <PriceInput
                            name="amount"
                            value={editDraft.amount}
                            onChange={(amount) =>
                              setEditDraft((current) =>
                                current ? { ...current, amount } : current,
                              )
                            }
                            className={inputClass}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            name="memo"
                            value={editDraft.memo}
                            onChange={(event) =>
                              setEditDraft((current) =>
                                current
                                  ? { ...current, memo: event.target.value }
                                  : current,
                              )
                            }
                            className={inputClass}
                          />
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                          {expense.created_by_name ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={(formData) => {
                              setMessage(null);
                              startUpdate(async () => {
                                formData.set("expense_id", expense.id);
                                formData.set("category_id", editDraft.category_id);
                                formData.set("expense_date", editDraft.expense_date);
                                formData.set("accrual_month", editDraft.accrual_month);
                                formData.set("amount", String(editDraft.amount));
                                formData.set("memo", editDraft.memo);
                                const result = await updateOverheadExpense(formData);
                                if (result?.error) {
                                  setMessage(result.error);
                                  return;
                                }
                                cancelEditing();
                                router.refresh();
                              });
                            }}
                            className="flex justify-end gap-2"
                          >
                            <input
                              type="hidden"
                              name="accrual_month"
                              value={editDraft.accrual_month}
                            />
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className={`${btnSecondary} px-3 py-1.5 text-xs`}
                            >
                              취소
                            </button>
                            <button
                              type="submit"
                              disabled={isUpdating}
                              className={`${btnPrimary} px-3 py-1.5 text-xs`}
                            >
                              저장
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={expense.id}
                      className="border-t border-zinc-200 dark:border-zinc-700"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateLabel(expense.expense_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {expense.category.group_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {expense.category.item_name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {formatKRW(expense.amount)}원
                      </td>
                      <td className="px-4 py-3 max-w-[12rem] truncate">
                        {expense.memo || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {expense.created_by_name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(expense)}
                            className={`${btnSecondary} px-3 py-1.5 text-xs`}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingExpense(expense)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deletingExpense ? (
        <ConfirmDialog
          title="판관비 내역 삭제"
          description={`${deletingExpense.category.group_name} · ${deletingExpense.category.item_name} (${formatKRW(deletingExpense.amount)}원) 내역을 삭제할까요?`}
          confirmLabel="삭제"
          confirmClassName="rounded-lg bg-red-600 px-4 py-2 text-sm font-normal text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
          onConfirm={() => {
            const expense = deletingExpense;
            setDeletingExpense(null);
            setMessage(null);
            startDelete(async () => {
              const formData = new FormData();
              formData.set("expense_id", expense.id);
              const result = await deleteOverheadExpense(formData);
              if (result?.error) {
                setMessage(result.error);
                return;
              }
              if (editingId === expense.id) cancelEditing();
              router.refresh();
            });
          }}
          onCancel={() => setDeletingExpense(null)}
        />
      ) : null}
    </div>
  );
}
