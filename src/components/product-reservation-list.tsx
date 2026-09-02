import type { ProductReservationEntry } from "@/lib/product-reservations";
import { reservationEntryChip, reservationLabel } from "@/lib/ui-classes";

type ProductReservationListProps = {
  entries: ProductReservationEntry[];
  compact?: boolean;
  className?: string;
};

function formatEntryLabel(entry: ProductReservationEntry) {
  const who = entry.managerName
    ? `${entry.customerName} (${entry.managerName})`
    : entry.customerName;
  return `${who} · ${entry.quoteDate} · ${entry.quantity}개`;
}

export default function ProductReservationList({
  entries,
  compact = false,
  className = "",
}: ProductReservationListProps) {
  if (entries.length === 0) {
    return compact ? null : (
      <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        예약 견적 없음
      </p>
    );
  }

  const textClass = compact
    ? `text-[10px] leading-tight ${reservationLabel}`
    : `text-xs leading-snug ${reservationLabel}`;

  return (
    <ul className={`space-y-0.5 ${textClass} ${className}`}>
      {entries.map((entry) => (
        <li
          key={`${entry.quoteId}-${entry.quantity}`}
          className={reservationEntryChip}
          title={formatEntryLabel(entry)}
        >
          {formatEntryLabel(entry)}
        </li>
      ))}
    </ul>
  );
}
