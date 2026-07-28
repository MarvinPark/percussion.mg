"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPaymentMethod,
  deletePaymentMethod,
  updatePaymentMethod,
} from "@/app/sales/payment-methods/actions";
import type { PaymentMethod } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type PaymentMethodsManagerProps = {
  paymentMethods: PaymentMethod[];
};

export default function PaymentMethodsManager({
  paymentMethods,
}: PaymentMethodsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFeeRate, setEditFeeRate] = useState(0);

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
    refresh();
  }

  function startEdit(method: PaymentMethod) {
    setEditingId(method.id);
    setEditName(method.name);
    setEditFeeRate(method.fee_rate);
    setError(null);
    setMessage(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          결제 수단 추가
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          이름과 수수료율(%)을 입력하세요. 판매 등록 화면에 바로 반영됩니다.
        </p>

        <form
          action={handleCreate}
          className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px_auto]"
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

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
          등록된 결제 수단
        </h3>

        {!paymentMethods.length ? (
          <p className="px-6 py-8 text-sm text-zinc-600 dark:text-zinc-400">
            등록된 결제 수단이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {paymentMethods.map((method) => (
              <li key={method.id} className="px-6 py-4">
                {editingId === method.id ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto_auto]">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editFeeRate}
                      onChange={(event) =>
                        setEditFeeRate(Number(event.target.value) || 0)
                      }
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(method.id)}
                      disabled={isPending}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {method.name}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        수수료 {method.fee_rate}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(method)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(method.id, method.name)}
                        className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:underline dark:text-red-400"
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
