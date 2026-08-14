import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AppUsageEventType = "excel_download" | "excel_import";

export type MonthlyUsageSummary = {
  monthLabel: string;
  productRegisters: number;
  sales: number;
  quotes: number;
  excelDownloads: number;
  excelImportRows: number;
  databaseBytes: number | null;
};

function getKstMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
  }).format(date);
}

function getKstMonthStartIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}-01T00:00:00+09:00`;
}

export function formatUsageMegabytes(bytes: number | null) {
  if (bytes === null || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export async function recordAppUsage(
  supabase: SupabaseClient,
  input: {
    eventType: AppUsageEventType;
    amount?: number;
    userId?: string | null;
  },
) {
  const amount = Math.max(1, Math.round(input.amount ?? 1));
  if (!Number.isFinite(amount)) return;

  try {
    const { error } = await supabase.from("app_usage_events").insert({
      event_type: input.eventType,
      amount,
      user_id: input.userId ?? null,
    });

    if (error) return;
  } catch {
    // usage logging must not block primary actions
  }
}

async function fetchMonthlyUsageFallback(
  supabase: SupabaseClient,
): Promise<MonthlyUsageSummary> {
  const monthStart = getKstMonthStartIso();

  const [productsResult, salesResult, quotesResult, downloadsResult, importsResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase
        .from("app_usage_events")
        .select("amount")
        .eq("event_type", "excel_download")
        .gte("created_at", monthStart),
      supabase
        .from("app_usage_events")
        .select("amount")
        .eq("event_type", "excel_import")
        .gte("created_at", monthStart),
    ]);

  const sumAmounts = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  let databaseBytes: number | null = null;
  const { data: dbSize } = await supabase.rpc("get_database_size_bytes");
  if (typeof dbSize === "number") {
    databaseBytes = dbSize;
  }

  return {
    monthLabel: getKstMonthLabel(),
    productRegisters: productsResult.count ?? 0,
    sales: salesResult.count ?? 0,
    quotes: quotesResult.count ?? 0,
    excelDownloads: downloadsResult.error
      ? 0
      : sumAmounts(downloadsResult.data as { amount: number }[] | null),
    excelImportRows: importsResult.error
      ? 0
      : sumAmounts(importsResult.data as { amount: number }[] | null),
    databaseBytes,
  };
}

export async function fetchMonthlyUsageSummary(
  supabase: SupabaseClient,
): Promise<MonthlyUsageSummary> {
  const empty: MonthlyUsageSummary = {
    monthLabel: getKstMonthLabel(),
    productRegisters: 0,
    sales: 0,
    quotes: 0,
    excelDownloads: 0,
    excelImportRows: 0,
    databaseBytes: null,
  };

  try {
    const { data, error } = await supabase.rpc("get_app_monthly_usage");

    if (error || !data || typeof data !== "object") {
      return fetchMonthlyUsageFallback(supabase);
    }

    const payload = data as Record<string, unknown>;

    return {
      monthLabel: getKstMonthLabel(),
      productRegisters: Number(payload.product_registers) || 0,
      sales: Number(payload.sales) || 0,
      quotes: Number(payload.quotes) || 0,
      excelDownloads: Number(payload.excel_downloads) || 0,
      excelImportRows: Number(payload.excel_import_rows) || 0,
      databaseBytes:
        typeof payload.database_bytes === "number"
          ? payload.database_bytes
          : null,
    };
  } catch {
    return empty;
  }
}
