import type { ProductReservationEntry } from "@/lib/product-reservations";

type ProductReservationListProps = {
  entries: ProductReservationEntry[];
  compact?: boolean;
  className?: string;
};

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
    ? "text-[10px] leading-tight text-emerald-800 dark:text-emerald-300"
    : "text-xs leading-snug text-emerald-800 dark:text-emerald-300";

  return (
    <ul className={`space-y-0.5 ${textClass} ${className}`}>
      {entries.map((entry) => (
        <li
          key={`${entry.quoteId}-${entry.quantity}`}
          className="truncate rounded bg-emerald-100/60 px-1 dark:bg-emerald-950/30"
          title={`${entry.customerName} · ${entry.quoteDate} · ${entry.quantity}개`}
        >
          {entry.customerName} · {entry.quoteDate} · {entry.quantity}
        </li>
      ))}
    </ul>
  );
}
