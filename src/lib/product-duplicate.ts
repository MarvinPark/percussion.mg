import type { createClient } from "@/lib/supabase/server";
import {
  belongsToSkuFamily,
  getBaseSku,
  nextVariantSku,
} from "@/lib/product-sku";
import { toPostgrestLikePrefixPattern } from "@/lib/postgrest-search-filter";

export const DUPLICATE_SKU_MESSAGE = "같은 SKU가 이미 등록되어 있습니다.";
export const DUPLICATE_PURCHASE_PRICE_MESSAGE =
  "같은 SKU 계열에 동일한 매입가 제품이 이미 있어 등록하지 않습니다.";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ProductSkuVariant = {
  sku: string;
  purchase_price: number;
};

export type RegistrationSkuContext = {
  variants: ProductSkuVariant[];
  reservedSkus: Set<string>;
  batchCounters: Map<string, number>;
};

export function normalizeProductSku(sku: string) {
  return sku.trim();
}

export function normalizePurchasePrice(value: number) {
  return Math.round(Number(value) || 0);
}

/** PostgREST가 한 번에 1000행까지만 돌려주므로 나눠 읽습니다. */
const PRODUCT_PAGE_SIZE = 1000;

/** 한 번의 or 필터에 묶을 SKU 계열 수 */
const FAMILY_FILTER_CHUNK = 50;

/** 계열이 이보다 많으면 조건을 나눠 던지는 것보다 전체를 훑는 편이 낫습니다. */
const FULL_SCAN_THRESHOLD = 150;

async function fetchProductSkuRowsPaged(
  supabase: SupabaseClient,
  select: string,
  orFilter: string | null,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("products")
      .select(select)
      .order("id", { ascending: true })
      .range(offset, offset + PRODUCT_PAGE_SIZE - 1);

    if (orFilter) {
      query = query.or(orFilter);
    }

    const { data, error } = await query;
    if (error || !data?.length) break;

    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PRODUCT_PAGE_SIZE) break;
    offset += PRODUCT_PAGE_SIZE;
  }

  return rows;
}

/**
 * 등록하려는 SKU가 속한 계열만 읽어옵니다.
 *
 * 중복 판정에 필요한 건 같은 계열(`BASE`, `BASE-1`, `BASE-2`…)뿐인데
 * 예전에는 products 전체를 select 했습니다. 제품이 1000개를 넘으면
 * PostgREST 응답 제한에 걸려 나머지가 검사에서 조용히 빠졌습니다.
 */
async function fetchSkuVariants(
  supabase: SupabaseClient,
  baseSkus: string[],
  includePurchasePrice: boolean,
): Promise<ProductSkuVariant[]> {
  if (!baseSkus.length) return [];

  const select = includePurchasePrice ? "sku, purchase_price" : "sku";
  const rows: Record<string, unknown>[] = [];

  if (baseSkus.length > FULL_SCAN_THRESHOLD) {
    rows.push(...(await fetchProductSkuRowsPaged(supabase, select, null)));
  } else {
    for (let i = 0; i < baseSkus.length; i += FAMILY_FILTER_CHUNK) {
      const filter = baseSkus
        .slice(i, i + FAMILY_FILTER_CHUNK)
        .map((base) => `sku.like.${toPostgrestLikePrefixPattern(base)}`)
        .join(",");

      rows.push(...(await fetchProductSkuRowsPaged(supabase, select, filter)));
    }
  }

  // 계열 접두사가 서로 겹치면 같은 행이 여러 번 올 수 있습니다.
  const bySku = new Map<string, ProductSkuVariant>();
  for (const row of rows) {
    const sku = normalizeProductSku(String(row.sku ?? ""));
    if (!sku || bySku.has(sku)) continue;
    bySku.set(sku, {
      sku,
      purchase_price: normalizePurchasePrice(Number(row.purchase_price) || 0),
    });
  }

  return [...bySku.values()];
}

function toBaseSkus(skus: string[]): string[] {
  const bases = new Set<string>();

  for (const raw of skus) {
    const sku = normalizeProductSku(raw);
    if (!sku) continue;
    const base = getBaseSku(sku);
    if (base) bases.add(base);
  }

  return [...bases];
}

/** 등록하려는 SKU 목록을 받아 해당 계열만 담은 컨텍스트를 만듭니다. */
export async function createRegistrationSkuContext(
  supabase: SupabaseClient,
  skus: string[],
): Promise<RegistrationSkuContext> {
  const variants = await fetchSkuVariants(supabase, toBaseSkus(skus), true);

  return {
    variants,
    reservedSkus: new Set(variants.map((variant) => variant.sku).filter(Boolean)),
    batchCounters: new Map(),
  };
}

/** 복제 전용: SKU 충돌만 확인하면 되므로 sku 컬럼만 조회합니다. */
export async function createDuplicateSkuContext(
  supabase: SupabaseClient,
  skus: string[],
): Promise<RegistrationSkuContext> {
  const variants = await fetchSkuVariants(supabase, toBaseSkus(skus), false);

  const reservedSkus = new Set<string>();
  for (const variant of variants) {
    if (variant.sku) reservedSkus.add(variant.sku);
  }

  return {
    variants: [],
    reservedSkus,
    batchCounters: new Map(),
  };
}

export function previewRegistrationSku(
  input: { sku: string; purchase_price: number },
  context: RegistrationSkuContext,
): { sku: string } | { error: string } {
  const sku = normalizeProductSku(input.sku);
  const purchasePrice = normalizePurchasePrice(input.purchase_price);

  if (!sku) {
    return { error: "SKU(모델번호)를 입력해 주세요." };
  }

  const baseSku = getBaseSku(sku);
  const family = context.variants.filter((variant) =>
    belongsToSkuFamily(baseSku, variant.sku),
  );

  if (family.some((variant) => variant.purchase_price === purchasePrice)) {
    return { error: DUPLICATE_PURCHASE_PRICE_MESSAGE };
  }

  const resolvedSku = context.reservedSkus.has(sku)
    ? nextVariantSku(sku, context.reservedSkus, context.batchCounters)
    : sku;

  return { sku: resolvedSku };
}

export function registerResolvedSku(
  context: RegistrationSkuContext,
  sku: string,
  purchasePriceInput: number,
) {
  const purchasePrice = normalizePurchasePrice(purchasePriceInput);
  context.reservedSkus.add(sku);
  context.variants.push({ sku, purchase_price: purchasePrice });
}

export function resolveDuplicateSku(
  input: { sku: string; purchase_price: number },
  context: RegistrationSkuContext,
): { sku: string } | { error: string } {
  const sku = normalizeProductSku(input.sku);
  if (!sku) {
    return { error: "SKU(모델번호)를 입력해 주세요." };
  }

  const resolvedSku = nextVariantSku(
    sku,
    context.reservedSkus,
    context.batchCounters,
  );

  registerResolvedSku(context, resolvedSku, input.purchase_price);
  return { sku: resolvedSku };
}

export function resolveRegistrationSku(
  input: { sku: string; purchase_price: number },
  context: RegistrationSkuContext,
): { sku: string } | { error: string } {
  const preview = previewRegistrationSku(input, context);
  if ("error" in preview) {
    return preview;
  }

  registerResolvedSku(context, preview.sku, input.purchase_price);
  return preview;
}

/** 엑셀 등록: 이미 있는 SKU는 복제와 같이 -1, -2… 접미사로 새 제품 등록 */
export function resolveExcelImportSku(
  input: { sku: string; purchase_price: number },
  context: RegistrationSkuContext,
): { sku: string; alreadyRegistered: boolean } | { error: string } {
  const sku = normalizeProductSku(input.sku);
  if (!sku) {
    return { error: "SKU(모델번호)를 입력해 주세요." };
  }

  if (context.reservedSkus.has(sku)) {
    const resolved = resolveDuplicateSku(input, context);
    if ("error" in resolved) {
      return resolved;
    }
    return { sku: resolved.sku, alreadyRegistered: true };
  }

  const preview = previewRegistrationSku(input, context);
  if ("error" in preview) {
    return preview;
  }

  return { sku: preview.sku, alreadyRegistered: false };
}

export async function findProductBySku(
  supabase: SupabaseClient,
  sku: string,
  excludeProductId?: string,
) {
  const normalized = normalizeProductSku(sku);
  if (!normalized) return null;

  let query = supabase
    .from("products")
    .select("id, sku")
    .eq("sku", normalized);

  if (excludeProductId) {
    query = query.neq("id", excludeProductId);
  }

  const { data } = await query.maybeSingle();
  return data;
}

export function duplicatePurchasePriceRowMessage(rowNumber: number) {
  return `${rowNumber}행: ${DUPLICATE_PURCHASE_PRICE_MESSAGE}`;
}
