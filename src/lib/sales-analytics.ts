import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesAnalyticsRow = {
  sold_at: string;
  total_amount: number;
  margin_amount: number;
  business_partner: string | null;
  sale_category: string;
  products: {
    brand: string | null;
    product_name: string;
  } | null;
};

export type SalesPeriodGranularity = "day" | "week" | "month";

export type SalesRankDimension =
  | "sale_category"
  | "business_partner"
  | "brand"
  | "product";

export const SALES_RANK_DIMENSION_LABELS: Record<SalesRankDimension, string> = {
  sale_category: "구분",
  business_partner: "거래처",
  brand: "브랜드",
  product: "품목",
};

export type SalesPeriodBucket = {
  key: string;
  label: string;
  sales: number;
  margin: number;
};

export type SalesRankEntry = {
  key: string;
  sales: number;
  margin: number;
};

export function toManwon(amount: number): number {
  return amount / 10000;
}

/** 차트 막대 위·축 라벨용 (만원 단위) */
export function formatManwonLabel(amount: number): string {
  const manwon = toManwon(amount);
  if (manwon === 0) return "0";
  if (manwon >= 100) return Math.round(manwon).toLocaleString("ko-KR");
  if (manwon >= 10) return manwon.toFixed(0);
  return manwon.toFixed(1);
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** 해당 날짜가 속한 주의 월요일 (ISO 주 시작) */
function startOfWeekMonday(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function getDefaultDateRange(
  granularity: SalesPeriodGranularity,
  now = new Date(),
): { start: string; end: string } {
  const end = formatDateISO(now);

  if (granularity === "month") {
    const start = formatDateISO(addMonths(startOfMonth(now), -12));
    return { start, end };
  }

  if (granularity === "week") {
    const start = formatDateISO(addDays(startOfWeekMonday(now), -11 * 7));
    return { start, end };
  }

  const start = formatDateISO(addDays(now, -29));
  return { start, end };
}

function bucketKey(
  soldAt: string,
  granularity: SalesPeriodGranularity,
): string {
  const date = parseLocalDate(soldAt);

  if (granularity === "month") {
    return soldAt.slice(0, 7);
  }

  if (granularity === "week") {
    return formatDateISO(startOfWeekMonday(date));
  }

  return soldAt;
}

function bucketLabel(key: string, granularity: SalesPeriodGranularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${y}.${m}`;
  }

  if (granularity === "week") {
    const date = parseLocalDate(key);
    const end = addDays(date, 6);
    const sm = date.getMonth() + 1;
    const sd = date.getDate();
    const em = end.getMonth() + 1;
    const ed = end.getDate();
    if (sm === em) return `${sm}/${sd}-${ed}`;
    return `${sm}/${sd}-${em}/${ed}`;
  }

  const [, m, d] = key.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function enumerateBucketKeys(
  start: string,
  end: string,
  granularity: SalesPeriodGranularity,
): string[] {
  const keys: string[] = [];
  let cursor = parseLocalDate(start);
  const endDate = parseLocalDate(end);

  if (granularity === "month") {
    cursor = startOfMonth(cursor);
    while (cursor <= endDate) {
      keys.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      );
      cursor = addMonths(cursor, 1);
    }
    return keys;
  }

  if (granularity === "week") {
    cursor = startOfWeekMonday(cursor);
    while (cursor <= endDate) {
      keys.push(formatDateISO(cursor));
      cursor = addDays(cursor, 7);
    }
    return keys;
  }

  while (cursor <= endDate) {
    keys.push(formatDateISO(cursor));
    cursor = addDays(cursor, 1);
  }

  return keys;
}

export function aggregateSalesByPeriod(
  rows: SalesAnalyticsRow[],
  granularity: SalesPeriodGranularity,
  start: string,
  end: string,
): SalesPeriodBucket[] {
  const totals = new Map<string, { sales: number; margin: number }>();

  for (const row of rows) {
    if (row.sold_at < start || row.sold_at > end) continue;
    const key = bucketKey(row.sold_at, granularity);
    const current = totals.get(key) ?? { sales: 0, margin: 0 };
    current.sales += Number(row.total_amount) || 0;
    current.margin += Number(row.margin_amount) || 0;
    totals.set(key, current);
  }

  return enumerateBucketKeys(start, end, granularity).map((key) => {
    const value = totals.get(key) ?? { sales: 0, margin: 0 };
    return {
      key,
      label: bucketLabel(key, granularity),
      sales: value.sales,
      margin: value.margin,
    };
  });
}

function getDimensionValue(
  row: SalesAnalyticsRow,
  dimension: SalesRankDimension,
): string {
  switch (dimension) {
    case "sale_category":
      return row.sale_category?.trim() || "미분류";
    case "business_partner":
      return row.business_partner?.trim() || "미지정";
    case "brand":
      return row.products?.brand?.trim() || "미분류";
    case "product":
      return row.products?.product_name?.trim() || "미분류";
  }
}

export function getCurrentMonthRange(now = new Date()): {
  start: string;
  end: string;
} {
  const start = formatDateISO(startOfMonth(now));
  const end = formatDateISO(now);
  return { start, end };
}

export function aggregateSalesRanking(
  rows: SalesAnalyticsRow[],
  dimension: SalesRankDimension,
  start: string,
  end: string,
  limit = 7,
): SalesRankEntry[] {
  const totals = new Map<string, { sales: number; margin: number }>();

  for (const row of rows) {
    if (row.sold_at < start || row.sold_at > end) continue;
    const key = getDimensionValue(row, dimension);
    const current = totals.get(key) ?? { sales: 0, margin: 0 };
    current.sales += Number(row.total_amount) || 0;
    current.margin += Number(row.margin_amount) || 0;
    totals.set(key, current);
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

export async function fetchSalesAnalyticsRows(
  supabase: SupabaseClient,
  monthsBack = 36,
) {
  const now = new Date();
  const start = formatDateISO(addMonths(startOfMonth(now), -monthsBack));

  const { data, error } = await supabase
    .from("sales")
    .select(
      "sold_at, total_amount, margin_amount, business_partner, sale_category, products(brand, product_name)",
    )
    .gte("sold_at", start)
    .order("sold_at", { ascending: true });

  const rows: SalesAnalyticsRow[] = (data ?? []).map((row) => {
    const product = Array.isArray(row.products)
      ? row.products[0]
      : row.products;

    return {
      sold_at: row.sold_at,
      total_amount: Number(row.total_amount) || 0,
      margin_amount: Number(row.margin_amount) || 0,
      business_partner: row.business_partner,
      sale_category: row.sale_category,
      products: product
        ? {
            brand: product.brand,
            product_name: product.product_name,
          }
        : null,
    };
  });

  return {
    rows,
    error,
    dataFrom: start,
  };
}
