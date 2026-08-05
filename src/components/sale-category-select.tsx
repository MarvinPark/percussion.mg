import {
  DEFAULT_SALE_CATEGORY,
  SALE_CATEGORIES,
  displaySaleCategory,
} from "@/lib/sale-categories";

const selectClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type SaleCategorySelectProps = {
  id?: string;
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export default function SaleCategorySelect({
  id = "sale_category",
  name = "sale_category",
  defaultValue,
  value,
  onChange,
  className = selectClass,
}: SaleCategorySelectProps) {
  const isControlled = value !== undefined;
  const resolvedValue = isControlled
    ? displaySaleCategory(value)
    : displaySaleCategory(defaultValue);

  return (
    <select
      id={id}
      name={isControlled ? undefined : name}
      required
      value={isControlled ? resolvedValue : undefined}
      defaultValue={isControlled ? undefined : resolvedValue || DEFAULT_SALE_CATEGORY}
      onChange={
        onChange
          ? (event) => onChange(event.target.value)
          : undefined
      }
      className={className}
    >
      {SALE_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
