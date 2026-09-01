"use client";

import type { ProductReservationEntry } from "@/lib/product-reservations";

type ProductReservationHoverProps = {
  quantity: number;
  entries: ProductReservationEntry[];
  className?: string;
};

function formatEntryLabel(entry: ProductReservationEntry) {
  const who = entry.managerName
    ? `${entry.customerName} (${entry.managerName})`
    : entry.customerName;
  return `${who} · ${entry.quoteDate} · ${entry.quantity}개`;
}

export default function ProductReservationHover({
  quantity,
  entries,
  className = "",
}: ProductReservationHoverProps) {
  const hasEntries = entries.length > 0;

  return (
    <div className={`group/reservation relative inline-block ${className}`}>
      <span
        className={`tabular-nums font-medium ${
          quantity > 0
            ? "cursor-help text-orange-700 underline decoration-orange-300 decoration-dotted underline-offset-2 dark:text-orange-300 dark:decoration-orange-700"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {quantity}
      </span>

      {hasEntries ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden min-w-[12rem] max-w-xs rounded-lg border border-orange-200 bg-white px-2.5 py-2 text-left shadow-lg group-hover/reservation:block dark:border-orange-800 dark:bg-zinc-900"
        >
          <p className="mb-1 text-[10px] font-semibold text-orange-800 dark:text-orange-300">
            견적 예약
          </p>
          <ul className="space-y-0.5 text-[11px] leading-snug text-orange-900 dark:text-orange-200">
            {entries.map((entry) => (
              <li key={`${entry.quoteId}-${entry.quantity}`}>
                {formatEntryLabel(entry)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
