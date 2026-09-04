"use client";

import { useMemo } from "react";
import { groupOverheadCategories } from "@/lib/overhead-expenses";
import type { OverheadCategory } from "@/types/overhead";

type OverheadCategoryReferenceTableProps = {
  categories: OverheadCategory[];
  selectedCategoryId?: string;
  onSelectCategory?: (categoryId: string) => void;
  fillHeight?: boolean;
};

export default function OverheadCategoryReferenceTable({
  categories,
  selectedCategoryId,
  onSelectCategory,
  fillHeight = false,
}: OverheadCategoryReferenceTableProps) {
  const groupedCategories = useMemo(() => {
    const activeCategories = categories.filter((category) => category.is_active);
    return groupOverheadCategories(activeCategories);
  }, [categories]);

  if (!groupedCategories.length) {
    return (
      <p className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        등록된 항목이 없습니다.
      </p>
    );
  }

  return (
    <div
      className={`overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 ${
        fillHeight ? "min-h-0 flex-1" : "max-h-[min(28rem,55vh)]"
      }`}
    >
      {groupedCategories.map((group) => (
        <div key={group.group_name}>
          <div className="sticky top-0 border-b border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200">
            {group.group_name}
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {group.items.map((category) => {
              const selected = category.id === selectedCategoryId;

              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(category.id)}
                    className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors ${
                      selected
                        ? "bg-blue-50 font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                        : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {category.item_name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
