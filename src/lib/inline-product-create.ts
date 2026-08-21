import {
  createRegistrationSkuContext,
  DUPLICATE_SKU_MESSAGE,
  resolveRegistrationSku,
} from "@/lib/product-duplicate";
import type {
  InlineCreatedProduct,
  InlineProductCreateInput,
} from "@/lib/inline-product-create-shared";
import { requirePermission } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const INLINE_PRODUCT_SELECT =
  "id, product_name, model_name, sku, supplier, category, brand, keywords, color, product_option, size, sale_price, purchase_price, stock_quantity";

export type { InlineCreatedProduct, InlineProductCreateInput };

export async function createInlineProduct(
  input: InlineProductCreateInput,
): Promise<{ error: string } | { product: InlineCreatedProduct }> {
  const product_name = input.product_name.trim();
  const model_name = input.model_name.trim();
  const sku = input.sku.trim();
  const supplier = input.supplier.trim();
  const category = input.category?.trim() || null;
  const brand = input.brand?.trim() || null;
  const color = input.color?.trim() || null;
  const product_option = input.product_option?.trim() || null;
  const size = input.size?.trim() || null;

  if (!product_name) return { error: "제품명을 입력해 주세요." };
  if (!model_name) return { error: "모델명을 입력해 주세요." };
  if (!sku) return { error: "SKU를 입력해 주세요." };
  if (!supplier) return { error: "공급처를 입력해 주세요." };
  if (input.sale_price < 0 || input.purchase_price < 0) {
    return { error: "가격은 0 이상이어야 합니다." };
  }

  const stock_quantity = Math.max(0, Math.round(input.stock_quantity ?? 0));
  if (!Number.isFinite(stock_quantity)) {
    return { error: "재고 수량은 0 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const auth = await requirePermission("manageProducts");
  if ("error" in auth) {
    return { error: auth.error ?? "제품 등록 권한이 없습니다." };
  }

  const registrationContext = await createRegistrationSkuContext(supabase);
  const resolved = resolveRegistrationSku(
    { sku, purchase_price: input.purchase_price },
    registrationContext,
  );
  if ("error" in resolved) {
    return { error: resolved.error };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      sku: resolved.sku,
      product_name,
      model_name,
      supplier,
      category,
      brand,
      color,
      product_option,
      size,
      purchase_price: Math.round(input.purchase_price),
      sale_price: Math.round(input.sale_price),
      stock_quantity,
      min_stock_quantity: 0,
      stock_floor3: stock_quantity,
      stock_b1: 0,
      stock_display: 0,
      stock_location: "3층",
      is_key_stock: false,
    })
    .select(INLINE_PRODUCT_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: DUPLICATE_SKU_MESSAGE };
    }
    return { error: "제품 등록에 실패했습니다." };
  }

  return {
    product: {
      id: data.id,
      product_name: data.product_name,
      model_name: data.model_name,
      sku: data.sku,
      supplier: data.supplier,
      category: data.category,
      brand: data.brand,
      keywords: data.keywords,
      color: data.color,
      product_option: data.product_option,
      size: data.size,
      sale_price: Number(data.sale_price) || 0,
      purchase_price: Number(data.purchase_price) || 0,
      stock_quantity: Number(data.stock_quantity) || 0,
    },
  };
}
