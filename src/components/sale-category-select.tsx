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
  className?: string;
};

export default function SaleCategorySelect({
  id = "sale_category",
  name = "sale_category",
  defaultValue,
  className = selectClass,
}: SaleCategorySelectProps) {
  const value = displaySaleCategory(defaultValue);

  return (
    <select
      id={id}
      name={name}
      required
      defaultValue={value || DEFAULT_SALE_CATEGORY}
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
