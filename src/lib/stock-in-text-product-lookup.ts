import {
  findProductBySku,
  normalizeProductSku,
} from "@/lib/product-duplicate";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type StockInLookupProductRow = {
  id: string;
  product_name: string;
  sku: string;
  model_name: string;
  brand: string | null;
  supplier: string;
  stock_quantity: number;
  stock_location: string | null;
  stock_yangjae: number;
  stock_uiwang: number;
};

const STOCK_IN_LOOKUP_SELECT =
  "id, product_name, sku, model_name, brand, supplier, stock_quantity, stock_location, stock_yangjae, stock_uiwang";

export function normalizeStockInSupplier(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function suppliersMatch(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  if (!a?.trim() || !b?.trim()) return false;
  return normalizeStockInSupplier(a) === normalizeStockInSupplier(b);
}

function normalizeBrand(value: string | null | undefined) {
  if (!value?.trim()) return "";
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function brandsMatch(
  dbBrand: string | null | undefined,
  lookupBrand: string,
) {
  const db = normalizeBrand(dbBrand);
  const want = normalizeBrand(lookupBrand);
  if (!db || !want) return false;
  return db === want || db.startsWith(want) || want.startsWith(db);
}

function filterBySupplier(
  rows: StockInLookupProductRow[],
  supplier: string | null,
) {
  if (!supplier?.trim()) return rows;
  return rows.filter((row) => suppliersMatch(row.supplier, supplier));
}

function pickUniqueMatch(rows: StockInLookupProductRow[]) {
  return rows.length === 1 ? rows[0] : null;
}

function resolveCandidates(
  rows: StockInLookupProductRow[] | null | undefined,
  supplier: string | null,
) {
  if (!rows?.length) return null;
  if (supplier?.trim()) {
    return pickUniqueMatch(filterBySupplier(rows, supplier));
  }
  return pickUniqueMatch(rows);
}

/** 「브랜드 모델」 형태를 등록 모달 기본값용으로 나눕니다. */
export function splitStockInLookupCode(code: string): {
  brand?: string;
  model_name: string;
} {
  const normalized = normalizeProductSku(code);
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      brand: parts[0],
      model_name: parts.slice(1).join(" "),
    };
  }
  return { model_name: normalized };
}

export async function findProductForStockInTextLookup(
  supabase: SupabaseClient,
  code: string,
  supplier: string | null,
): Promise<StockInLookupProductRow | null> {
  const normalized = normalizeProductSku(code);
  if (!normalized) return null;

  const bySkuRef = await findProductBySku(supabase, normalized);
  if (bySkuRef?.id) {
    const { data } = await supabase
      .from("products")
      .select(STOCK_IN_LOOKUP_SELECT)
      .eq("id", bySkuRef.id)
      .maybeSingle();

    const row = data as StockInLookupProductRow | null;
    if (!row) return null;
    if (supplier?.trim() && !suppliersMatch(row.supplier, supplier)) {
      return null;
    }
    return row;
  }

  const { data: byModelExact } = await supabase
    .from("products")
    .select(STOCK_IN_LOOKUP_SELECT)
    .eq("model_name", normalized);

  let found = resolveCandidates(
    (byModelExact as StockInLookupProductRow[] | null) ?? [],
    supplier,
  );
  if (found) return found;

  const { data: byModelIlike } = await supabase
    .from("products")
    .select(STOCK_IN_LOOKUP_SELECT)
    .ilike("model_name", normalized);

  found = resolveCandidates(
    (byModelIlike as StockInLookupProductRow[] | null) ?? [],
    supplier,
  );
  if (found) return found;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const brandPart = tokens[0];
    const modelPart = tokens.slice(1).join(" ");

    const { data: byModelPart } = await supabase
      .from("products")
      .select(STOCK_IN_LOOKUP_SELECT)
      .eq("model_name", modelPart);

    const brandFiltered = ((byModelPart as StockInLookupProductRow[] | null) ??
      []).filter((row) => brandsMatch(row.brand, brandPart));

    found = resolveCandidates(brandFiltered, supplier);
    if (found) return found;

    const { data: byModelPartIlike } = await supabase
      .from("products")
      .select(STOCK_IN_LOOKUP_SELECT)
      .ilike("model_name", modelPart);

    const brandFilteredIlike = (
      (byModelPartIlike as StockInLookupProductRow[] | null) ?? []
    ).filter((row) => brandsMatch(row.brand, brandPart));

    found = resolveCandidates(brandFilteredIlike, supplier);
    if (found) return found;
  }

  return null;
}
