"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createSaleCategoryOption,
  deleteSaleCategoryOption,
  updateSaleCategoryOption,
} from "@/app/(main)/settings/users/actions";
import type { SaleCategoryOption } from "@/lib/sale-category-options";

const compactBtnClass =
  "rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

const compactDeleteBtnClass =
  "rounded px-2 py-0.5 text-xs text-red-600 hover:underline dark:text-red-400";

const compactInputClass =
  "w-full rounded border border-zinc-400 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type SaleCategoriesManagerProps = {
  options: SaleCategoryOption[];
  schemaError?: string | null;
  needsMigration?: boolean;
};

export default function SaleCategoriesManager({
  options,
  schemaError,
  needsMigration = false,
}: SaleCategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await createSaleCategoryOption(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setMessage("구분이 추가되었습니다.");
    refresh();
  }

  async function handleUpdate(id: string) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("name", editName);

    const result = await updateSaleCategoryOption(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setEditingId(null);
    setMessage("구분이 수정되었습니다.");
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 구분을 삭제할까요?`)) return;

    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("id", id);

    const result = await deleteSaleCategoryOption(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setMessage("구분이 삭제되었습니다.");
    refresh();
  }

  if (schemaError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        견적 구분을 불러오지 못했습니다.
        <p className="mt-2 text-xs opacity-80">{schemaError}</p>
      </div>
    );
  }

  const readOnly = needsMigration;

  return (
    <div className="space-y-4">
      {needsMigration ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          아래는 기본 구분 목록입니다. 추가·수정하려면 Supabase SQL Editor에서{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/schema-admin-settings.sql
          </code>
          와{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/schema-sale-category-dynamic.sql
          </code>
          을 실행해 주세요.
        </p>
      ) : null}

      {!readOnly ? (
        <form
          action={handleCreate}
          className="grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <label htmlFor="sale_category_name" className={labelClass}>
              구분 추가
            </label>
            <input
              id="sale_category_name"
              name="name"
              required
              placeholder="예: 렌탈, 도매"
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              추가
            </button>
          </div>
        </form>
      ) : null}

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

      {!options.length ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          등록된 구분이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {options.map((option) => (
            <li key={option.id} className="px-3 py-1.5">
              {editingId === option.id ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className={compactInputClass}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(option.id)}
                    disabled={isPending}
                    className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
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
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {option.name}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {!readOnly ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(option.id);
                            setEditName(option.name);
                            setError(null);
                            setMessage(null);
                          }}
                          className={compactBtnClass}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(option.id, option.name)}
                          className={compactDeleteBtnClass}
                        >
                          삭제
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
