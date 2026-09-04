"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOverheadCategory,
  deleteOverheadCategory,
  updateOverheadCategory,
} from "@/app/(main)/settings/overhead/actions";
import { groupOverheadCategories } from "@/lib/overhead-expenses";
import type { OverheadCategory } from "@/types/overhead";

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

type OverheadCategoriesManagerProps = {
  categories: OverheadCategory[];
  schemaError?: string | null;
};

export default function OverheadCategoriesManager({
  categories,
  schemaError,
}: OverheadCategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editItemName, setEditItemName] = useState("");

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories],
  );
  const groupedCategories = useMemo(
    () => groupOverheadCategories(activeCategories),
    [activeCategories],
  );
  const groupOptions = useMemo(
    () => groupedCategories.map((group) => group.group_name),
    [groupedCategories],
  );

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await createOverheadCategory(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setMessage("판관비 항목이 추가되었습니다.");
    refresh();
  }

  async function handleUpdate(id: string) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("category_id", id);
    formData.set("group_name", editGroupName);
    formData.set("item_name", editItemName);

    const result = await updateOverheadCategory(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setEditingId(null);
    setMessage("판관비 항목이 수정되었습니다.");
    refresh();
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`"${label}" 항목을 삭제할까요?\n사용 중인 항목은 비활성화됩니다.`)) {
      return;
    }

    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("category_id", id);

    const result = await deleteOverheadCategory(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setMessage(
      result?.deactivated
        ? "사용 중인 항목이라 비활성화했습니다."
        : "판관비 항목이 삭제되었습니다.",
    );
    refresh();
  }

  if (schemaError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        판관비 항목을 불러오지 못했습니다.
        <p className="mt-2 text-xs opacity-80">{schemaError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        action={handleCreate}
        className="grid gap-3"
      >
        <div>
          <label htmlFor="overhead_group_name" className={labelClass}>
            대분류
          </label>
          <input
            id="overhead_group_name"
            name="group_name"
            list="overhead_group_options"
            required
            placeholder="예: 마케팅·영업"
            className={inputClass}
          />
          <datalist id="overhead_group_options">
            {groupOptions.map((groupName) => (
              <option key={groupName} value={groupName} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="overhead_item_name" className={labelClass}>
            세부항목
          </label>
          <input
            id="overhead_item_name"
            name="item_name"
            required
            placeholder="예: 온라인 광고"
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

      {!activeCategories.length ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          등록된 판관비 항목이 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {groupedCategories.map((group) => (
            <div
              key={group.group_name}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
            >
              <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100">
                {group.group_name}
              </div>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {group.items.map((category) => (
                  <li key={category.id} className="px-3 py-1.5">
                    {editingId === category.id ? (
                      <div className="space-y-2">
                        <input
                          value={editGroupName}
                          onChange={(event) => setEditGroupName(event.target.value)}
                          list="overhead_group_options"
                          className={compactInputClass}
                        />
                        <input
                          value={editItemName}
                          onChange={(event) => setEditItemName(event.target.value)}
                          className={compactInputClass}
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdate(category.id)}
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
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {category.item_name}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(category.id);
                              setEditGroupName(category.group_name);
                              setEditItemName(category.item_name);
                              setError(null);
                              setMessage(null);
                            }}
                            className={compactBtnClass}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                category.id,
                                `${category.group_name} · ${category.item_name}`,
                              )
                            }
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
