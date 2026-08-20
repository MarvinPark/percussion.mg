import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SALE_CATEGORY,
  FALLBACK_SALE_CATEGORIES,
} from "@/lib/sale-categories";

export type SaleCategoryOption = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

function isMissingCategoryTableError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("sale_category_options") ||
    message.includes("does not exist") ||
    message.includes("42P01")
  );
}

function staticSaleCategoryOptions(): SaleCategoryOption[] {
  return FALLBACK_SALE_CATEGORIES.map((name, index) => ({
    id: `static-${index}`,
    name,
    sort_order: index + 1,
    is_active: true,
  }));
}

export async function fetchSaleCategoryOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("sale_category_options")
    .select("id, name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return {
      options: [] as SaleCategoryOption[],
      names: isMissingCategoryTableError(error.message)
        ? ([...FALLBACK_SALE_CATEGORIES] as string[])
        : ([...FALLBACK_SALE_CATEGORIES] as string[]),
      error: isMissingCategoryTableError(error.message) ? null : error.message,
    };
  }

  if (!data?.length) {
    return {
      options: [] as SaleCategoryOption[],
      names: [...FALLBACK_SALE_CATEGORIES] as string[],
      error: null,
    };
  }

  const options = data as SaleCategoryOption[];
  return {
    options,
    names: options.map((option) => option.name),
    error: null,
  };
}

export async function fetchAllSaleCategoryOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("sale_category_options")
    .select("id, name, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!error) {
    return {
      options: (data ?? []) as SaleCategoryOption[],
      error: null,
      needsMigration: false,
    };
  }

  if (isMissingCategoryTableError(error.message)) {
    return {
      options: staticSaleCategoryOptions(),
      error: null,
      needsMigration: true,
    };
  }

  return {
    options: [] as SaleCategoryOption[],
    error: error.message,
    needsMigration: false,
  };
}

export function parseSaleCategoryFromList(
  value: string,
  allowedNames: readonly string[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return allowedNames.includes(trimmed) ? trimmed : null;
}

export function displaySaleCategoryFromList(
  value: string | null | undefined,
  allowedNames: readonly string[],
): string {
  const trimmed = value?.trim();
  if (trimmed && allowedNames.includes(trimmed)) return trimmed;
  if (trimmed) return trimmed;
  if (allowedNames.includes(DEFAULT_SALE_CATEGORY)) {
    return DEFAULT_SALE_CATEGORY;
  }
  return allowedNames[0] ?? DEFAULT_SALE_CATEGORY;
}

export async function resolveSaleCategory(
  supabase: SupabaseClient,
  value: string,
): Promise<string | null> {
  const { names } = await fetchSaleCategoryOptions(supabase);
  return parseSaleCategoryFromList(value, names);
}
