"use client";

import {
  formatProductReservationLine,
  type ProductReservationEntry,
} from "@/lib/product-reservations";
import { reservationQtyText, reservationTooltipBody, reservationTooltipShell } from "@/lib/ui-classes";

type ProductReservationHoverProps = {
  quantity: number;
  entries: ProductReservationEntry[];
  className?: string;
};

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
          <ul className={reservationTooltipBody}>
            {entries.map((entry, index) => (
              <li key={`${entry.quoteId}-${entry.quantity}-${index}`}>
                {formatProductReservationLine(entry)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
