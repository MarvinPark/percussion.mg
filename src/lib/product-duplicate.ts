import type { createClient } from "@/lib/supabase/server";
import {
  belongsToSkuFamily,
  getBaseSku,
  nextVariantSku,
} from "@/lib/product-sku";

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

export async function createRegistrationSkuContext(
  supabase: SupabaseClient,
): Promise<RegistrationSkuContext> {
  const { data } = await supabase.from("products").select("sku, purchase_price");

  const variants = (data ?? []).map((row) => ({
    sku: normalizeProductSku(row.sku),
    purchase_price: normalizePurchasePrice(row.purchase_price),
  }));

  return {
    variants,
    reservedSkus: new Set(variants.map((variant) => variant.sku).filter(Boolean)),
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
    ? nextVariantSku(baseSku, context.reservedSkus, context.batchCounters)
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

  const baseSku = getBaseSku(sku);
  const resolvedSku = nextVariantSku(
    baseSku,
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
