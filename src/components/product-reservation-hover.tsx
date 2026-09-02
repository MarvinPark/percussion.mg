"use client";

import type { ProductReservationEntry } from "@/lib/product-reservations";
import {
  reservationLabel,
  reservationQtyText,
  reservationTooltipBody,
  reservationTooltipShell,
} from "@/lib/ui-classes";

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
            ? `cursor-help ${reservationQtyText}`
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {quantity}
      </span>

      {hasEntries ? (
        <div role="tooltip" className={reservationTooltipShell}>
          <p className={`mb-1 text-[10px] font-semibold ${reservationLabel}`}>
            견적 예약
          </p>
          <ul className={reservationTooltipBody}>
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
