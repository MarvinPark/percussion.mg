import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OverheadCategory,
  OverheadExpenseWithCategory,
  OverheadGroupSummary,
} from "@/types/overhead";

export function isOverheadSchemaError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("overhead_categories") ||
    message.includes("overhead_expenses")
  );
}

export function mapOverheadCategoryRow(
  row: Record<string, unknown>,
): OverheadCategory {
  return {
    id: String(row.id),
    group_name: String(row.group_name ?? ""),
    item_name: String(row.item_name ?? ""),
    group_sort_order: Number(row.group_sort_order ?? 0),
    item_sort_order: Number(row.item_sort_order ?? 0),
    is_active: Boolean(row.is_active ?? true),
  };
}

export function mapOverheadExpenseRow(
  row: Record<string, unknown>,
): OverheadExpenseWithCategory {
  const categoryRow = row.overhead_categories as Record<string, unknown> | null;

  return {
    id: String(row.id),
    category_id: String(row.category_id),
    expense_date: String(row.expense_date ?? ""),
    accrual_month: String(row.accrual_month ?? ""),
    amount: Math.round(Number(row.amount) || 0),
    memo: row.memo ? String(row.memo) : null,
    created_by_user_id: row.created_by_user_id
      ? String(row.created_by_user_id)
      : null,
    created_by_name: row.created_by_name ? String(row.created_by_name) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    category: categoryRow
      ? mapOverheadCategoryRow(categoryRow)
      : {
          id: String(row.category_id),
          group_name: "",
          item_name: "",
          group_sort_order: 0,
          item_sort_order: 0,
          is_active: true,
        },
  };
}

export function parseAccrualMonth(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  return `${trimmed}-01`;
}

export function formatAccrualMonthLabel(accrualMonth: string) {
  const match = accrualMonth.match(/^(\d{4})-(\d{2})/);
  if (!match) return accrualMonth;
  return `${match[1]}년 ${Number(match[2])}월`;
}

export function currentAccrualMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function currentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchOverheadCategories(
  supabase: SupabaseClient,
): Promise<{ categories: OverheadCategory[]; error: string | null }> {
  const { data, error } = await supabase
    .from("overhead_categories")
    .select(
      "id, group_name, item_name, group_sort_order, item_sort_order, is_active",
    )
    .eq("is_active", true)
    .order("group_sort_order", { ascending: true })
    .order("item_sort_order", { ascending: true });

  if (error) {
    if (isOverheadSchemaError(error.message)) {
      return {
        categories: [],
        error:
          "판관비 테이블이 없습니다. Supabase에서 supabase/schema-overhead-expenses.sql을 실행해 주세요.",
      };
    }
    return { categories: [], error: "판관비 항목을 불러오지 못했습니다." };
  }

  return {
    categories: (data ?? []).map((row) =>
      mapOverheadCategoryRow(row as Record<string, unknown>),
    ),
    error: null,
  };
}

export async function fetchOverheadExpensesForMonth(
  supabase: SupabaseClient,
  accrualMonth: string,
): Promise<{ expenses: OverheadExpenseWithCategory[]; error: string | null }> {
  const parsedMonth = parseAccrualMonth(accrualMonth.slice(0, 7));
  if (!parsedMonth) {
    return { expenses: [], error: "귀속월 형식이 올바르지 않습니다." };
  }

  const { data, error } = await supabase
    .from("overhead_expenses")
    .select(
      `
        id,
        category_id,
        expense_date,
        accrual_month,
        amount,
        memo,
        created_by_user_id,
        created_by_name,
        created_at,
        updated_at,
        overhead_categories (
          id,
          group_name,
          item_name,
          group_sort_order,
          item_sort_order,
          is_active
        )
      `,
    )
    .eq("accrual_month", parsedMonth)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isOverheadSchemaError(error.message)) {
      return {
        expenses: [],
        error:
          "판관비 테이블이 없습니다. Supabase에서 supabase/schema-overhead-expenses.sql을 실행해 주세요.",
      };
    }
    return { expenses: [], error: "판관비 내역을 불러오지 못했습니다." };
  }

  return {
    expenses: (data ?? []).map((row) =>
      mapOverheadExpenseRow(row as Record<string, unknown>),
    ),
    error: null,
  };
}

export async function fetchOverheadTotalForMonth(
  supabase: SupabaseClient,
  accrualMonth: string,
): Promise<number> {
  const parsedMonth = parseAccrualMonth(accrualMonth.slice(0, 7));
  if (!parsedMonth) return 0;

  const { data, error } = await supabase
    .from("overhead_expenses")
    .select("amount.sum()")
    .eq("accrual_month", parsedMonth);

  if (!error && data?.length) {
    const row = data[0] as Record<string, unknown>;
    const sumField = row.sum;
    if (typeof sumField === "number") {
      return Math.round(sumField);
    }
    if (typeof row.amount === "number") {
      return Math.round(row.amount);
    }
  }

  const fallback = await supabase
    .from("overhead_expenses")
    .select("amount")
    .eq("accrual_month", parsedMonth);

  if (fallback.error) return 0;

  return (fallback.data ?? []).reduce(
    (sum, row) => sum + Math.round(Number(row.amount) || 0),
    0,
  );
}

export function summarizeOverheadByGroup(
  expenses: OverheadExpenseWithCategory[],
): OverheadGroupSummary[] {
  const totals = new Map<string, OverheadGroupSummary>();

  for (const expense of expenses) {
    const groupName = expense.category.group_name;
    const existing = totals.get(groupName);
    if (existing) {
      existing.total_amount += expense.amount;
      continue;
    }

    totals.set(groupName, {
      group_name: groupName,
      group_sort_order: expense.category.group_sort_order,
      total_amount: expense.amount,
    });
  }

  return [...totals.values()].sort(
    (a, b) => a.group_sort_order - b.group_sort_order,
  );
}

export function buildGroupChartData(
  categories: OverheadCategory[],
  expenses: OverheadExpenseWithCategory[],
): OverheadGroupSummary[] {
  const totals = summarizeOverheadByGroup(expenses);
  const totalsMap = new Map(
    totals.map((summary) => [summary.group_name, summary.total_amount]),
  );

  const groups = new Map<string, number>();
  for (const category of categories) {
    if (!groups.has(category.group_name)) {
      groups.set(category.group_name, category.group_sort_order);
    }
  }

  return [...groups.entries()]
    .map(([group_name, group_sort_order]) => ({
      group_name,
      group_sort_order,
      total_amount: totalsMap.get(group_name) ?? 0,
    }))
    .sort((a, b) => a.group_sort_order - b.group_sort_order);
}

export function formatOverheadCategoryLabel(category: OverheadCategory) {
  return `${category.group_name} · ${category.item_name}`;
}

export function searchOverheadCategories(
  categories: OverheadCategory[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return categories
    .filter((category) => {
      const label = formatOverheadCategoryLabel(category).toLowerCase();
      return (
        label.includes(normalized) ||
        category.group_name.toLowerCase().includes(normalized) ||
        category.item_name.toLowerCase().includes(normalized)
      );
    })
    .slice(0, 40);
}

export function shiftAccrualMonth(value: string, offset: number) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;

  const date = new Date(Number(match[1]), Number(match[2]) - 1 + offset, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function buildMonthButtonOptions(centerMonth: string, span = 6) {
  const half = Math.floor(span / 2);
  return Array.from({ length: span }, (_, index) =>
    shiftAccrualMonth(centerMonth, index - half),
  );
}

export function formatMonthButtonLabel(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return month;
  return `${Number(match[2])}월`;
}

export async function fetchAllOverheadCategories(
  supabase: SupabaseClient,
): Promise<{ categories: OverheadCategory[]; error: string | null }> {
  const { data, error } = await supabase
    .from("overhead_categories")
    .select(
      "id, group_name, item_name, group_sort_order, item_sort_order, is_active",
    )
    .order("group_sort_order", { ascending: true })
    .order("item_sort_order", { ascending: true });

  if (error) {
    if (isOverheadSchemaError(error.message)) {
      return {
        categories: [],
        error:
          "판관비 테이블이 없습니다. Supabase에서 supabase/schema-overhead-expenses.sql을 실행해 주세요.",
      };
    }
    return { categories: [], error: "판관비 항목을 불러오지 못했습니다." };
  }

  return {
    categories: (data ?? []).map((row) =>
      mapOverheadCategoryRow(row as Record<string, unknown>),
    ),
    error: null,
  };
}

export function groupOverheadCategories(categories: OverheadCategory[]) {
  const groups = new Map<string, OverheadCategory[]>();

  for (const category of categories) {
    const items = groups.get(category.group_name) ?? [];
    items.push(category);
    groups.set(category.group_name, items);
  }

  return [...groups.entries()]
    .map(([group_name, items]) => ({
      group_name,
      group_sort_order: items[0]?.group_sort_order ?? 0,
      items,
    }))
    .sort((a, b) => a.group_sort_order - b.group_sort_order);
}
