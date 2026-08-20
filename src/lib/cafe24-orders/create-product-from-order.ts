import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductMatchCandidate } from "@/lib/marketplace-product-match";
import type { ParsedCafe24OrderRow } from "@/lib/cafe24-orders/types";

function buildSku(order: ParsedCafe24OrderRow) {
  const code = order.sellerProductCode.trim();
  if (code) return code.slice(0, 80);
  if (order.productNo.trim()) return `C24-${order.productNo.trim()}`.slice(0, 80);
  return `C24-${order.lineId.replace(/[^a-zA-Z0-9|]/g, "").slice(-16) || "item"}`;
}

export async function createProductFromCafe24Order(
  supabase: SupabaseClient,
  order: ParsedCafe24OrderRow,
): Promise<ProductMatchCandidate | { error: string }> {
  const sku = buildSku(order);
  const supplier = "카페24";
  const productOption = order.productOption.trim() || null;

  const { data: existing } = await supabase
    .from("products")
    .select("id, sku, product_name, model_name, brand, purchase_price, sale_price")
    .eq("sku", sku)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      sku: existing.sku,
      product_name: existing.product_name,
      model_name: existing.model_name,
      brand: existing.brand,
      purchase_price: Number(existing.purchase_price) || 0,
      sale_price: Number(existing.sale_price) || 0,
    };
  }

  const modelName = order.productOption.trim() || order.productName.trim();

  const { data, error } = await supabase
    .from("products")
    .insert({
      sku,
      product_name: order.productName.trim() || "카페24 상품",
      model_name: modelName || sku,
      supplier,
      product_option: productOption,
      purchase_price: 0,
      sale_price: order.unitSalePrice,
      stock_quantity: 0,
      min_stock_quantity: 0,
      stock_floor3: 0,
      stock_b1: 0,
      stock_display: 0,
      stock_location: "3층",
      is_key_stock: false,
    })
    .select("id, sku, product_name, model_name, brand, purchase_price, sale_price")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retryExisting } = await supabase
        .from("products")
        .select("id, sku, product_name, model_name, brand, purchase_price, sale_price")
        .eq("sku", sku)
        .maybeSingle();

      if (retryExisting) {
        return {
          id: retryExisting.id,
          sku: retryExisting.sku,
          product_name: retryExisting.product_name,
          model_name: retryExisting.model_name,
          brand: retryExisting.brand,
          purchase_price: Number(retryExisting.purchase_price) || 0,
          sale_price: Number(retryExisting.sale_price) || 0,
        };
      }
    }

    return { error: "카페24 제품 자동 등록에 실패했습니다." };
  }

  return {
    id: data.id,
    sku: data.sku,
    product_name: data.product_name,
    model_name: data.model_name,
    brand: data.brand,
    purchase_price: Number(data.purchase_price) || 0,
    sale_price: Number(data.sale_price) || 0,
  };
}
