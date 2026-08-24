"use client";

import { useEffect, useRef, useState } from "react";
import {
  moveSalesSection,
  SALES_SECTION_LABELS,
  type SalesSectionId,
} from "@/lib/sales-section-order-preferences";

const buttonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const reorderButtonClass =
  "inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

type SalesSectionOrderControlProps = {
  order: SalesSectionId[];
  onChange: (nextOrder: SalesSectionId[]) => void;
};

export default function SalesSectionOrderControl({
  order,
  onChange,
}: SalesSectionOrderControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleMove(sectionId: SalesSectionId, direction: "up" | "down") {
    const nextOrder = moveSalesSection(order, sectionId, direction);
    if (nextOrder) {
      onChange(nextOrder);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={buttonClass}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
      >
        구분 순서
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="px-1 pb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            온라인 · 도매 · 그외 표시 순서
          </p>
          <ul className="space-y-1">
            {order.map((sectionId, index) => (
              <li
                key={sectionId}
                className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                  {index + 1}. {SALES_SECTION_LABELS[sectionId]}
                </span>
                <button
                  type="button"
                  aria-label={`${SALES_SECTION_LABELS[sectionId]} 위로`}
                  disabled={index === 0}
                  onClick={() => handleMove(sectionId, "up")}
                  className={reorderButtonClass}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`${SALES_SECTION_LABELS[sectionId]} 아래로`}
                  disabled={index === order.length - 1}
                  onClick={() => handleMove(sectionId, "down")}
                  className={reorderButtonClass}
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
