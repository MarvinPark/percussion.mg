import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateSaleAmounts } from "@/lib/sales-calculator";
import {
  DEFAULT_SALE_CATEGORY,
  formatSaleCategoryDbError,
} from "@/lib/sale-categories";
import { resolveSaleCategory } from "@/lib/sale-category-options";
import { getModifierInfo } from "@/lib/profile";
import {
  addLocationStock,
  deductLocationStock,
  sumLocationStock,
} from "@/lib/stock-locations";

type SalePaymentMethod = {
  name: string;
  fee_rate: number;
};

type SaleLinePayload = {
  sold_at: string;
  sale_category?: string | null;
  product_id: string;
  quantity: number;
  unit_sale_price: number;
  unit_purchase_price: number;
  customer_name: string | null;
  business_partner: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: string;
  payment_fee_rate: number;
  payment_fee_amount: number;
  total_amount: number;
  margin_amount: number;
  shipping_cost?: number;
  note: string | null;
  created_by_user_id: string;
  created_by_name: string;
  quote_id?: string | null;
};

export function formatSaleInsertError(error: {
  message?: string;
  code?: string;
  details?: string;
}) {
  const message = error.message ?? "";

  if (message.includes("sale_category")) {
    return (
      formatSaleCategoryDbError(message, "sales") ??
      "sales 테이블에 sale_category 컬럼이 없습니다. supabase/schema-sales-category.sql을 실행해 주세요."
    );
  }

  if (message.includes("customer_phone") || message.includes("customer_address")) {
    return "sales 테이블에 고객 연락처 컬럼이 없습니다. supabase/schema-sales-update.sql을 실행해 주세요.";
  }

  if (message.includes("quote_id")) {
    return "sales 테이블에 quote_id 컬럼이 없습니다. supabase/schema-quotes-conversion.sql을 실행해 주세요.";
  }

  if (message.includes("shipping_cost")) {
    return "sales 테이블에 shipping_cost 컬럼이 없습니다. supabase/schema-sales-shipping-cost.sql을 실행해 주세요.";
  }

  if (error.code === "42501" || message.includes("row-level security")) {
    return "매출 등록 권한이 없습니다. supabase/schema-sales.sql의 sales insert policy를 확인해 주세요.";
  }

  if (error.code === "23503") {
    return "연결된 제품 또는 사용자 정보가 유효하지 않습니다.";
  }

  if (message) {
    return message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

export async function validateProductStock(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
) {
  const productResult = await getProductForSale(supabase, productId);
  if ("error" in productResult) {
    return productResult;
  }

  if (productResult.product.stock_quantity < quantity) {
    return {
      error: `재고가 부족합니다. (현재 ${productResult.product.stock_quantity}개, 판매 ${quantity}개)` as const,
    };
  }

  return { product: productResult.product };
}

export async function getProductForSale(
  supabase: SupabaseClient,
  productId: string,
) {
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity, purchase_price, product_name")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "제품을 찾을 수 없습니다." as const };
  }

  return {
    product: {
      stock_quantity: Number(product.stock_quantity) || 0,
      purchase_price: Number(product.purchase_price) || 0,
      product_name: product.product_name as string,
    },
  };
}

export async function insertSaleRecord(
  supabase: SupabaseClient,
  payload: SaleLinePayload,
) {
  const sale_category =
    (await resolveSaleCategory(supabase, payload.sale_category ?? "")) ??
    DEFAULT_SALE_CATEGORY;

  const row = {
    sold_at: payload.sold_at,
    sale_category,
    product_id: payload.product_id,
    quantity: Math.round(payload.quantity),
    unit_sale_price: Math.round(payload.unit_sale_price),
    unit_purchase_price: Math.round(payload.unit_purchase_price),
    customer_name: payload.customer_name,
    business_partner: payload.business_partner,
    customer_phone: payload.customer_phone,
    customer_address: payload.customer_address,
    payment_method: payload.payment_method,
    payment_fee_rate: Number(payload.payment_fee_rate) || 0,
    payment_fee_amount: Math.round(payload.payment_fee_amount),
    total_amount: Math.round(payload.total_amount),
    margin_amount: Math.round(payload.margin_amount),
    shipping_cost: Math.max(0, Math.round(payload.shipping_cost ?? 0)),
    note: payload.note,
    created_by_user_id: payload.created_by_user_id,
    created_by_name: payload.created_by_name,
    ...(payload.quote_id ? { quote_id: payload.quote_id } : {}),
  };

  const { data, error } = await supabase
    .from("sales")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return { error: formatSaleInsertError(error) };
  }

  return { saleId: data.id as string };
}

export async function recordStockOutForSale(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  note: string,
) {
  const modifier = await getModifierInfo();
  if ("error" in modifier) return modifier;

  const { data: product } = await supabase
    .from("products")
    .select(
      "stock_quantity, stock_location, stock_floor3, stock_b1, stock_display",
    )
    .eq("id", productId)
    .single();

  if (!product) return { error: "제품을 찾을 수 없습니다." as const };

  const stockBefore = product.stock_quantity;
  const locationPatch = deductLocationStock(product, quantity, true);

  const stockAfter = sumLocationStock({ ...product, ...locationPatch });

  const { error: movementError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    movement_type: "out",
    quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    note,
    modified_by_user_id: modifier.userId,
    modified_by_name: modifier.name,
  });

  if (movementError) {
    return { error: "재고 출고 기록에 실패했습니다." as const };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      ...locationPatch,
      stock_quantity: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return { error: "재고 수량 업데이트에 실패했습니다." as const };
  }

  return { ok: true as const };
}

export async function recordStockIn(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  note: string,
) {
  const modifier = await getModifierInfo();
  if ("error" in modifier) return modifier;

  const { data: product } = await supabase
    .from("products")
    .select(
      "stock_quantity, stock_location, stock_floor3, stock_b1, stock_display",
    )
    .eq("id", productId)
    .single();

  if (!product) return { error: "제품을 찾을 수 없습니다." as const };

  const stockBefore = product.stock_quantity;
  const locationPatch = addLocationStock(product, quantity);
  const stockAfter = sumLocationStock({ ...product, ...locationPatch });

  await supabase.from("stock_movements").insert({
    product_id: productId,
    movement_type: "in",
    quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    note,
    modified_by_user_id: modifier.userId,
    modified_by_name: modifier.name,
  });

  await supabase
    .from("products")
    .update({
      ...locationPatch,
      stock_quantity: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  return { ok: true as const };
}

export async function deleteSaleRecord(
  supabase: SupabaseClient,
  saleId: string,
) {
  await supabase.from("sales").delete().eq("id", saleId);
}

export function buildSaleAmountsForLine(
  quantity: number,
  unitSalePrice: number,
  unitPurchasePrice: number,
  paymentMethod: SalePaymentMethod,
  shippingCost = 0,
) {
  return calculateSaleAmounts({
    quantity,
    unitSalePrice,
    unitPurchasePrice,
    feeRate: Number(paymentMethod.fee_rate) || 0,
    shippingCost,
  });
}

export type { SaleLinePayload };
