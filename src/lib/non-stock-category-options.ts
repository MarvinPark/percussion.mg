import type { SupabaseClient } from "@supabase/supabase-js";

export const FALLBACK_NON_STOCK_CATEGORIES = ["배송비", "출장비"] as const;

export type NonStockCategoryOption = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

function isMissingTableError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("non_stock_category_options") ||
    message.includes("does not exist") ||
    message.includes("42P01")
  );
}

function staticNonStockCategoryOptions(): NonStockCategoryOption[] {
  return FALLBACK_NON_STOCK_CATEGORIES.map((name, index) => ({
    id: `static-${index}`,
    name,
    sort_order: index + 1,
    is_active: true,
  }));
}

export async function fetchNonStockCategoryOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("non_stock_category_options")
    .select("id, name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return {
      options: [] as NonStockCategoryOption[],
      names: isMissingTableError(error.message)
        ? ([...FALLBACK_NON_STOCK_CATEGORIES] as string[])
        : ([...FALLBACK_NON_STOCK_CATEGORIES] as string[]),
      error: isMissingTableError(error.message) ? null : error.message,
    };
  }

  if (!data?.length) {
    return {
      options: [] as NonStockCategoryOption[],
      names: [...FALLBACK_NON_STOCK_CATEGORIES] as string[],
      error: null,
    };
  }

  const options = data as NonStockCategoryOption[];
  return {
    options,
    names: options.map((option) => option.name),
    error: null,
  };
}

export async function fetchAllNonStockCategoryOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("non_stock_category_options")
    .select("id, name, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!error) {
    return {
      options: (data ?? []) as NonStockCategoryOption[],
      error: null,
      needsMigration: false,
    };
  }

  if (isMissingTableError(error.message)) {
    return {
      options: staticNonStockCategoryOptions(),
      error: null,
      needsMigration: true,
    };
  }

  return {
    options: [] as NonStockCategoryOption[],
    error: error.message,
    needsMigration: false,
  };
}

export async function fetchNonStockCategoryNames(supabase: SupabaseClient) {
  const { names } = await fetchNonStockCategoryOptions(supabase);
  return names.length ? names : [...FALLBACK_NON_STOCK_CATEGORIES];
}
