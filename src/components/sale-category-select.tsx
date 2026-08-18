import {
  DEFAULT_SALE_CATEGORY,
  SALE_CATEGORIES,
} from "@/lib/sale-categories";

const selectClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type SaleCategorySelectProps = {
  id?: string;
  name?: string;
  categories?: readonly string[];
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

function resolveCategories(categories?: readonly string[]) {
  if (categories?.length) return categories;
  return SALE_CATEGORIES;
}

function displayValue(
  value: string | null | undefined,
  categories: readonly string[],
) {
  if (value && categories.includes(value)) return value;
  if (categories.includes(DEFAULT_SALE_CATEGORY)) return DEFAULT_SALE_CATEGORY;
  return categories[0] ?? DEFAULT_SALE_CATEGORY;
}

export default function SaleCategorySelect({
  id = "sale_category",
  name = "sale_category",
  categories: categoriesProp,
  defaultValue,
  value,
  onChange,
  className = selectClass,
}: SaleCategorySelectProps) {
  const categories = resolveCategories(categoriesProp);
  const isControlled = value !== undefined;
  const resolvedValue = isControlled
    ? displayValue(value, categories)
    : displayValue(defaultValue, categories);

  return (
    <select
      id={id}
      name={isControlled ? undefined : name}
      required
      value={isControlled ? resolvedValue : undefined}
      defaultValue={isControlled ? undefined : resolvedValue}
      onChange={
        onChange ? (event) => onChange(event.target.value) : undefined
      }
      className={className}
    >
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
