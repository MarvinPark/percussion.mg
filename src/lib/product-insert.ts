import type { SupabaseClient } from "@supabase/supabase-js";

const BASE_PRODUCT_SELECT =
  "id, product_name, model_name, sku, supplier, category, brand, color, product_option, size, sale_price, purchase_price, stock_quantity";

const EXTENDED_PRODUCT_SELECT = `${BASE_PRODUCT_SELECT}, keywords`;

export type ProductInsertCore = {
  sku: string;
  product_name: string;
  model_name: string;
  supplier: string;
  category: string | null;
  brand: string | null;
  color: string | null;
  product_option: string | null;
  size: string | null;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_quantity: number;
};

export type InsertedProductRow = {
  id: string;
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  category: string | null;
  brand: string | null;
  keywords: string | null;
  color: string | null;
  product_option: string | null;
  size: string | null;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
};

export function isMissingProductColumnError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("42703") ||
    message.includes("PGRST204") ||
    message.includes("does not exist") ||
    message.includes("Could not find the") ||
    message.includes("schema cache")
  );
}

function normalizeInsertedRow(
  row: Record<string, unknown>,
): InsertedProductRow {
  return {
    id: String(row.id),
    product_name: String(row.product_name),
    model_name: String(row.model_name),
    sku: String(row.sku),
    supplier: String(row.supplier),
    category: (row.category as string | null) ?? null,
    brand: (row.brand as string | null) ?? null,
    keywords: (row.keywords as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    product_option: (row.product_option as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    sale_price: Number(row.sale_price) || 0,
    purchase_price: Number(row.purchase_price) || 0,
    stock_quantity: Number(row.stock_quantity) || 0,
  };
}

type InsertAttempt = {
  payload: Record<string, unknown>;
  select: string;
};

export async function insertProductRow(
  supabase: SupabaseClient,
  core: ProductInsertCore,
  options?: { stock_floor3?: number },
): Promise<{ data: InsertedProductRow } | { error: { code?: string; message: string } }> {
  const extendedPayload = {
    ...core,
    stock_floor3: options?.stock_floor3 ?? core.stock_quantity,
    stock_b1: 0,
    stock_display: 0,
    stock_location: "3층",
    is_key_stock: false,
  };

  const attempts: InsertAttempt[] = [
    { payload: extendedPayload, select: EXTENDED_PRODUCT_SELECT },
    { payload: extendedPayload, select: BASE_PRODUCT_SELECT },
    { payload: core, select: BASE_PRODUCT_SELECT },
  ];

  let lastError: { code?: string; message: string } | null = null;

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("products")
      .insert(attempt.payload)
      .select(attempt.select)
      .single();

    if (!error && data) {
      return {
        data: normalizeInsertedRow(data as unknown as Record<string, unknown>),
      };
    }

    lastError = {
      code: error?.code,
      message: error?.message ?? "제품 등록에 실패했습니다.",
    };

    if (!isMissingProductColumnError(error?.message)) {
      break;
    }
  }

  return { error: lastError ?? { message: "제품 등록에 실패했습니다." } };
}

export function formatProductInsertError(error: {
  code?: string;
  message: string;
}) {
  if (error.code === "23505") {
    return null;
  }

  if (isMissingProductColumnError(error.message)) {
    return "제품 DB 스키마가 최신이 아닙니다. Supabase SQL Editor에서 supabase/schema-product-keywords.sql과 schema-product-stock-locations.sql을 실행해 주세요.";
  }

  return `제품 등록에 실패했습니다. (${error.message})`;
}
