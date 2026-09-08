import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesAnalyticsRow = {
  sold_at: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  purchase_amount: number;
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
  purchase: number;
  margin: number;
};

export type SalesProductPeriodBucket = SalesPeriodBucket & {
  salesQuantity: number;
  purchaseQuantity: number;
};

export type SalesRankEntry = {
  key: string;
  sales: number;
  margin: number;
};

/**
 * 일자별로 미리 합산한 매출 버킷입니다.
 *
 * 대시보드 차트는 이 버킷만 받고 원본 매출 행은 받지 않습니다. 전송량이
 * 매출 건수가 아니라 달력 일수에 비례하므로 매출이 늘어도 늘지 않습니다.
 * 매출이 없는 날은 아예 포함하지 않습니다.
 */
export type SalesDailyBucket = {
  date: string;
  sales: number;
  purchase: number;
  margin: number;
};

/** 차원별 당월 매출 순위 (클라이언트에서 기준을 바꿔도 재조회가 필요 없도록 전 차원을 미리 계산합니다) */
export type SalesMonthRankings = Record<SalesRankDimension, SalesRankEntry[]>;

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
    return `${y.slice(-2)}.${m}`;
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

/** 원본 매출 행을 일자별 버킷으로 합산합니다. 서버에서만 호출합니다. */
export function aggregateSalesDaily(
  rows: Pick<
    SalesAnalyticsRow,
    "sold_at" | "total_amount" | "purchase_amount" | "margin_amount"
  >[],
): SalesDailyBucket[] {
  const totals = new Map<
    string,
    { sales: number; purchase: number; margin: number }
  >();

  for (const row of rows) {
    const current = totals.get(row.sold_at) ?? {
      sales: 0,
      purchase: 0,
      margin: 0,
    };
    current.sales += Number(row.total_amount) || 0;
    current.purchase += Number(row.purchase_amount) || 0;
    current.margin += Number(row.margin_amount) || 0;
    totals.set(row.sold_at, current);
  }

  return [...totals.entries()]
    .map(([date, value]) => ({ date, ...value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * 일자별 버킷을 원하는 granularity로 다시 묶습니다.
 *
 * 원본 행 대신 일별 합계를 입력으로 받으므로, 클라이언트가 서버 왕복 없이
 * 일/주/월을 전환하고 기간을 바꿀 수 있습니다.
 */
export function aggregateDailyBuckets(
  daily: SalesDailyBucket[],
  granularity: SalesPeriodGranularity,
  start: string,
  end: string,
): SalesPeriodBucket[] {
  const totals = new Map<
    string,
    { sales: number; purchase: number; margin: number }
  >();

  for (const bucket of daily) {
    if (bucket.date < start || bucket.date > end) continue;
    const key = bucketKey(bucket.date, granularity);
    const current = totals.get(key) ?? { sales: 0, purchase: 0, margin: 0 };
    current.sales += bucket.sales;
    current.purchase += bucket.purchase;
    current.margin += bucket.margin;
    totals.set(key, current);
  }

  return enumerateBucketKeys(start, end, granularity).map((key) => {
    const value = totals.get(key) ?? { sales: 0, purchase: 0, margin: 0 };
    return {
      key,
      label: bucketLabel(key, granularity),
      sales: value.sales,
      purchase: value.purchase,
      margin: value.margin,
    };
  });
}

export function aggregateProductSalesByPeriod(
  rows: SalesAnalyticsRow[],
  productId: string,
  granularity: SalesPeriodGranularity,
  start: string,
  end: string,
): SalesProductPeriodBucket[] {
  const filtered = rows.filter((row) => row.product_id === productId);

  const totals = new Map<
    string,
    {
      sales: number;
      purchase: number;
      margin: number;
      salesQuantity: number;
      purchaseQuantity: number;
    }
  >();

  for (const row of filtered) {
    if (row.sold_at < start || row.sold_at > end) continue;
    const key = bucketKey(row.sold_at, granularity);
    const quantity = Number(row.quantity) || 0;
    const current = totals.get(key) ?? {
      sales: 0,
      purchase: 0,
      margin: 0,
      salesQuantity: 0,
      purchaseQuantity: 0,
    };
    current.sales += Number(row.total_amount) || 0;
    current.purchase += Number(row.purchase_amount) || 0;
    current.margin += Number(row.margin_amount) || 0;
    current.salesQuantity += quantity;
    current.purchaseQuantity += quantity;
    totals.set(key, current);
  }

  return enumerateBucketKeys(start, end, granularity).map((key) => {
    const value = totals.get(key) ?? {
      sales: 0,
      purchase: 0,
      margin: 0,
      salesQuantity: 0,
      purchaseQuantity: 0,
    };
    return {
      key,
      label: bucketLabel(key, granularity),
      sales: value.sales,
      purchase: value.purchase,
      margin: value.margin,
      salesQuantity: value.salesQuantity,
      purchaseQuantity: value.purchaseQuantity,
    };
  });
}

/** 순위 집계에 필요한 최소 필드. SalesAnalyticsRow도 그대로 넘길 수 있습니다. */
export type SalesRankingRow = Pick<
  SalesAnalyticsRow,
  | "sold_at"
  | "total_amount"
  | "margin_amount"
  | "business_partner"
  | "sale_category"
  | "products"
>;

function getDimensionValue(
  row: SalesRankingRow,
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
  rows: SalesRankingRow[],
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

/** PostgREST가 한 번에 1000행까지만 돌려주므로 범위를 나눠 전부 읽습니다. */
const SALES_PAGE_SIZE = 1000;

async function fetchSalesRowsPaged(
  supabase: SupabaseClient,
  select: string,
  start: string,
  end?: string,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("sales")
      .select(select)
      .gte("sold_at", start)
      .order("sold_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + SALES_PAGE_SIZE - 1);

    if (end) {
      query = query.lte("sold_at", end);
    }

    const { data, error } = await query;

    if (error) {
      return { rows: [], error: "매출 분석 데이터를 불러오지 못했습니다." };
    }

    if (!data?.length) break;

    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < SALES_PAGE_SIZE) break;
    offset += SALES_PAGE_SIZE;
  }

  return { rows, error: null };
}

function toRankingRow(row: Record<string, unknown>): SalesRankingRow {
  const productField = row.products;
  const product = (
    Array.isArray(productField) ? productField[0] : productField
  ) as { brand?: string | null; product_name?: string } | null | undefined;

  return {
    sold_at: String(row.sold_at),
    total_amount: Number(row.total_amount) || 0,
    margin_amount: Number(row.margin_amount) || 0,
    business_partner: (row.business_partner as string | null) ?? null,
    sale_category: String(row.sale_category ?? ""),
    products: product
      ? {
          brand: product.brand ?? null,
          product_name: product.product_name ?? "",
        }
      : null,
  };
}

/**
 * 추이 차트용 일자별 매출 버킷을 가져옵니다.
 *
 * 제품 조인 없이 금액 컬럼만 읽고 서버에서 일자별로 합산하므로,
 * 클라이언트로 넘어가는 데이터가 매출 건수와 무관하게 유지됩니다.
 */
export async function fetchSalesDailyBuckets(
  supabase: SupabaseClient,
  monthsBack = 36,
): Promise<{
  buckets: SalesDailyBucket[];
  error: string | null;
  dataFrom: string;
}> {
  const start = formatDateISO(addMonths(startOfMonth(new Date()), -monthsBack));

  const { rows, error } = await fetchSalesRowsPaged(
    supabase,
    "sold_at, total_amount, margin_amount, unit_purchase_price, quantity",
    start,
  );

  const buckets = aggregateSalesDaily(
    rows.map((row) => ({
      sold_at: String(row.sold_at),
      total_amount: Number(row.total_amount) || 0,
      purchase_amount:
        (Number(row.unit_purchase_price) || 0) * (Number(row.quantity) || 0),
      margin_amount: Number(row.margin_amount) || 0,
    })),
  );

  return { buckets, error, dataFrom: start };
}

/** 순위 차트가 기준(구분/거래처/브랜드/품목)을 바꿔도 재조회하지 않도록 상위 20개까지 미리 계산합니다. */
const MONTH_RANKING_LIMIT = 20;

/** 당월 매출 순위를 차원별로 미리 집계합니다. 조회 범위가 한 달이라 조인을 포함해도 가볍습니다. */
export async function fetchCurrentMonthRankings(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<{ rankings: SalesMonthRankings; error: string | null }> {
  const { start, end } = getCurrentMonthRange(now);

  const { rows, error } = await fetchSalesRowsPaged(
    supabase,
    "sold_at, total_amount, margin_amount, business_partner, sale_category, products(brand, product_name)",
    start,
    end,
  );

  const rankingRows = rows.map(toRankingRow);

  const rankings = {
    sale_category: aggregateSalesRanking(
      rankingRows,
      "sale_category",
      start,
      end,
      MONTH_RANKING_LIMIT,
    ),
    business_partner: aggregateSalesRanking(
      rankingRows,
      "business_partner",
      start,
      end,
      MONTH_RANKING_LIMIT,
    ),
    brand: aggregateSalesRanking(
      rankingRows,
      "brand",
      start,
      end,
      MONTH_RANKING_LIMIT,
    ),
    product: aggregateSalesRanking(
      rankingRows,
      "product",
      start,
      end,
      MONTH_RANKING_LIMIT,
    ),
  } satisfies SalesMonthRankings;

  return { rankings, error };
}

/** 제품별 추이 차트용. 제품을 선택했을 때만 해당 제품·기간만 조회합니다. */
export async function fetchProductSalesBuckets(
  supabase: SupabaseClient,
  productId: string,
  granularity: SalesPeriodGranularity,
  start: string,
  end: string,
): Promise<{ buckets: SalesProductPeriodBucket[]; error: string | null }> {
  const { data, error } = await supabase
    .from("sales")
    .select("sold_at, product_id, quantity, total_amount, margin_amount, unit_purchase_price")
    .eq("product_id", productId)
    .gte("sold_at", start)
    .lte("sold_at", end)
    .order("sold_at", { ascending: true });

  if (error) {
    return { buckets: [], error: "제품 판매 추이를 불러오지 못했습니다." };
  }

  const rows: SalesAnalyticsRow[] = (data ?? []).map((row) => ({
    sold_at: String(row.sold_at),
    product_id: String(row.product_id),
    quantity: Number(row.quantity) || 0,
    total_amount: Number(row.total_amount) || 0,
    purchase_amount:
      (Number(row.unit_purchase_price) || 0) * (Number(row.quantity) || 0),
    margin_amount: Number(row.margin_amount) || 0,
    business_partner: null,
    sale_category: "",
    products: null,
  }));

  return {
    buckets: aggregateProductSalesByPeriod(
      rows,
      productId,
      granularity,
      start,
      end,
    ),
    error: null,
  };
}
