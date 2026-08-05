import type { SupabaseClient } from "@supabase/supabase-js";
import { matchProductForSmartstoreOrder } from "@/lib/naver-commerce/match-product";
import type { ProductMatchCandidate } from "@/lib/naver-commerce/match-product";

const GMARKET_SUPPLIER = "지마켓";

type GmarketOrderProduct = {
  orderLineId: string;
  productName: string;
  productOption: string;
  sellerProductCode: string;
  quantity: number;
  totalPaymentAmount: number;
};

function buildGmarketSku(order: GmarketOrderProduct) {
  const code = order.sellerProductCode.trim();
  if (code) return code.slice(0, 80);
  return `GM-${order.orderLineId.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "item"}`;
}

export function matchProductForGmarketOrder(
  products: ProductMatchCandidate[],
  order: GmarketOrderProduct,
) {
  return matchProductForSmartstoreOrder(products, {
    sellerProductCode: order.sellerProductCode,
    productName: order.productName,
    productOption: order.productOption,
  });
}

export async function createProductFromGmarketOrder(
  supabase: SupabaseClient,
  order: GmarketOrderProduct,
): Promise<ProductMatchCandidate | { error: string }> {
  const unitSalePrice =
    order.quantity > 0
      ? Math.round(order.totalPaymentAmount / order.quantity)
      : order.totalPaymentAmount;

  const sku = buildGmarketSku(order);
  const productOption = order.productOption.trim() || null;

  const { data: existing } = await supabase
    .from("products")
    .select("id, sku, product_name, model_name, purchase_price, sale_price")
    .eq("sku", sku)
    .eq("supplier", GMARKET_SUPPLIER)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      sku: existing.sku,
      product_name: existing.product_name,
      model_name: existing.model_name,
      purchase_price: Number(existing.purchase_price) || 0,
      sale_price: Number(existing.sale_price) || 0,
    };
  }

  const modelName = order.productOption.trim() || order.productName.trim();

  const { data, error } = await supabase
    .from("products")
    .insert({
      sku,
      product_name: order.productName.trim() || "지마켓 상품",
      model_name: modelName || sku,
      supplier: GMARKET_SUPPLIER,
      product_option: productOption,
      purchase_price: 0,
      sale_price: unitSalePrice,
      stock_quantity: 0,
      min_stock_quantity: 0,
      stock_floor3: 0,
      stock_b1: 0,
      stock_display: 0,
      stock_location: "3층",
      is_key_stock: false,
    })
    .select("id, sku, product_name, model_name, purchase_price, sale_price")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retryExisting } = await supabase
        .from("products")
        .select("id, sku, product_name, model_name, purchase_price, sale_price")
        .eq("sku", sku)
        .eq("supplier", GMARKET_SUPPLIER)
        .maybeSingle();

      if (retryExisting) {
        return {
          id: retryExisting.id,
          sku: retryExisting.sku,
          product_name: retryExisting.product_name,
          model_name: retryExisting.model_name,
          purchase_price: Number(retryExisting.purchase_price) || 0,
          sale_price: Number(retryExisting.sale_price) || 0,
        };
      }
    }

    return { error: "지마켓 제품 자동 등록에 실패했습니다." };
  }

  return {
    id: data.id,
    sku: data.sku,
    product_name: data.product_name,
    model_name: data.model_name,
    purchase_price: Number(data.purchase_price) || 0,
    sale_price: Number(data.sale_price) || 0,
  };
}
