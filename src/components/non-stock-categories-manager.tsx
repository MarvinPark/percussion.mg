"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createNonStockCategoryOption,
  deleteNonStockCategoryOption,
  updateNonStockCategoryOption,
} from "@/app/(main)/settings/users/actions";
import ModelNameAutocomplete from "@/components/model-name-autocomplete";
import type { NonStockCategoryOption } from "@/lib/non-stock-category-options";
import type { QuoteProductOption } from "@/types/quote";

const compactBtnClass =
  "rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

const compactDeleteBtnClass =
  "rounded px-2 py-0.5 text-xs text-red-600 hover:underline dark:text-red-400";

const compactInputClass =
  "w-full rounded border border-zinc-400 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type NonStockCategoriesManagerProps = {
  options: NonStockCategoryOption[];
  schemaError?: string | null;
  needsMigration?: boolean;
};

function resolveNonStockEntryName(product: QuoteProductOption) {
  return product.model_name?.trim() || product.sku?.trim() || "";
}

function productSelectionLabel(product: QuoteProductOption) {
  return (product.model_name || product.sku || "").trim();
}

export default function NonStockCategoriesManager({
  options,
  schemaError,
  needsMigration = false,
}: NonStockCategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<QuoteProductOption | null>(
    null,
  );
  const [selectedEntryName, setSelectedEntryName] = useState("");

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedEntryName) {
      setError("제품을 검색해 선택해 주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("name", selectedEntryName);

    const result = await createNonStockCategoryOption(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setProductSearch("");
    setSelectedProduct(null);
    setSelectedEntryName("");
    setMessage("모델명이 추가되었습니다.");
    refresh();
  }

  function handleProductSelect(product: QuoteProductOption) {
    const entryName = resolveNonStockEntryName(product);
    if (!entryName) {
      setSelectedProduct(null);
      setSelectedEntryName("");
      setError("선택한 제품에서 추가할 모델명을 확인할 수 없습니다.");
      return;
    }

    if (options.some((option) => option.name === entryName)) {
      setSelectedProduct(null);
      setSelectedEntryName("");
      setError(`"${entryName}" 모델명은 이미 등록되어 있습니다.`);
      return;
    }

    setSelectedProduct(product);
    setSelectedEntryName(entryName);
    setError(null);
    setMessage(null);
  }

  function handleProductSearchChange(value: string) {
    setProductSearch(value);
    setError(null);

    if (!selectedProduct) {
      if (selectedEntryName) {
        setSelectedEntryName("");
      }
      return;
    }

    const label = productSelectionLabel(selectedProduct);
    if (value.trim() !== label) {
      setSelectedProduct(null);
      setSelectedEntryName("");
    }
  }

  async function handleUpdate(id: string) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("name", editName);

    const result = await updateNonStockCategoryOption(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setEditingId(null);
    setMessage("품목이 수정되었습니다.");
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 품목을 삭제할까요?`)) return;

    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("id", id);

    const result = await deleteNonStockCategoryOption(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setMessage("품목이 삭제되었습니다.");
    refresh();
  }

  if (schemaError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        재고 미반영 품목을 불러오지 못했습니다.
        <p className="mt-2 text-xs opacity-80">{schemaError}</p>
      </div>
    );
  }

  const readOnly = needsMigration;

  return (
    <div className="space-y-4">
      {needsMigration ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          아래는 기본 목록입니다. 추가·수정하려면 Supabase SQL Editor에서{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/schema-non-stock-categories.sql
          </code>
          을 실행해 주세요.
        </p>
      ) : null}

      {!readOnly ? (
        <form onSubmit={handleCreate} className="grid gap-3">
          <div>
            <label htmlFor="non_stock_category_search" className={labelClass}>
              모델명 추가
            </label>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              견적과 동일하게 제품을 검색해 선택하면 해당 제품의 모델명이 추가됩니다.
            </p>
            <ModelNameAutocomplete
              value={productSearch}
              onChange={handleProductSearchChange}
              onSelectProduct={handleProductSelect}
              placeholder="모델명·SKU 검색"
            />
            {selectedEntryName ? (
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                추가할 모델명:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedEntryName}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending || !selectedEntryName}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500"
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
          등록된 모델명이 없습니다.
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {option.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
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
