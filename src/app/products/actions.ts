"use server";

import { getModifierInfo, requirePermission } from "@/lib/profile";
import { nextPasteSku } from "@/lib/product-sku";
import {
  addLocationStock,
  deductLocationStock,
  isStockLocation,
  normalizeStockLocation,
  sumLocationStock,
  type StockLocation,
  type StockLocationField,
  STOCK_LOCATION_FIELD,
} from "@/lib/stock-locations";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function recordStockMovement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    product_id: string;
    movement_type: "in" | "out" | "adjust";
    quantity: number;
    stock_before: number;
    stock_after: number;
    note: string | null;
  },
) {
  const modifier = await getModifierInfo();

  if ("error" in modifier) {
    return modifier;
  }

  const { error } = await supabase.from("stock_movements").insert({
    ...payload,
    modified_by_user_id: modifier.userId,
    modified_by_name: modifier.name,
  });

  if (error) {
    return { error: "재고 변동 기록 저장에 실패했습니다." };
  }

  return { ok: true as const };
}

function parseProductForm(formData: FormData) {
  const stock_location = String(formData.get("stock_location") ?? "3층").trim();
  const stock_quantity = Number(formData.get("stock_quantity") ?? 0);

  const locationStocks = {
    stock_floor3: 0,
    stock_b1: 0,
    stock_display: 0,
  };

  if (formData.has("stock_floor3")) {
    locationStocks.stock_floor3 = Number(formData.get("stock_floor3") ?? 0);
    locationStocks.stock_b1 = Number(formData.get("stock_b1") ?? 0);
    locationStocks.stock_display = Number(formData.get("stock_display") ?? 0);
  } else if (isStockLocation(stock_location)) {
    const field = STOCK_LOCATION_FIELD[stock_location];
    locationStocks[field as keyof typeof locationStocks] = stock_quantity;
  } else {
    locationStocks.stock_floor3 = stock_quantity;
  }

  return {
    sku: String(formData.get("sku") ?? "").trim(),
    product_name: String(formData.get("product_name") ?? "").trim(),
    model_name: String(formData.get("model_name") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    supplier: String(formData.get("supplier") ?? "").trim(),
    color: String(formData.get("color") ?? "").trim(),
    product_option: String(formData.get("product_option") ?? "").trim(),
    size: String(formData.get("size") ?? "").trim(),
    purchase_price: Number(formData.get("purchase_price") ?? 0),
    sale_price: Number(formData.get("sale_price") ?? 0),
    stock_quantity,
    min_stock_quantity: Number(formData.get("min_stock_quantity") ?? 0),
    keywords: String(formData.get("keywords") ?? "").trim(),
    is_key_stock: formData.get("is_key_stock") === "on",
    stock_location: normalizeStockLocation(stock_location),
    ...locationStocks,
  };
}

function validateProduct(data: ReturnType<typeof parseProductForm>) {
  if (!data.sku) return "SKU(모델번호)를 입력해 주세요.";
  if (!data.product_name) return "제품명을 입력해 주세요.";
  if (!data.model_name) return "모델명을 입력해 주세요.";
  if (!data.supplier) return "공급처를 입력해 주세요.";
  if (data.purchase_price < 0 || data.sale_price < 0) {
    return "가격은 0 이상이어야 합니다.";
  }
  if (data.stock_quantity < 0 || data.min_stock_quantity < 0) {
    return "재고 수량은 0 이상이어야 합니다.";
  }
  if (
    data.stock_floor3 < 0 ||
    data.stock_b1 < 0 ||
    data.stock_display < 0
  ) {
    return "위치별 재고는 0 이상이어야 합니다.";
  }
  return null;
}

function productPayload(data: ReturnType<typeof parseProductForm>) {
  const total = sumLocationStock(data);

  return {
    sku: data.sku,
    product_name: data.product_name,
    model_name: data.model_name,
    brand: data.brand || null,
    category: data.category || null,
    supplier: data.supplier,
    color: data.color || null,
    product_option: data.product_option || null,
    size: data.size || null,
    purchase_price: data.purchase_price,
    sale_price: data.sale_price,
    stock_quantity: total,
    min_stock_quantity: data.min_stock_quantity,
    keywords: data.keywords || null,
    is_key_stock: data.is_key_stock,
    stock_location: data.stock_location,
    stock_floor3: data.stock_floor3,
    stock_b1: data.stock_b1,
    stock_display: data.stock_display,
  };
}

async function ensureManageProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const auth = await requirePermission("manageProducts");
  if ("error" in auth) return auth;
  return null;
}

export async function createProduct(formData: FormData) {
  const data = parseProductForm(formData);
  const error = validateProduct(data);
  if (error) return { error };

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { error: dbError } = await supabase
    .from("products")
    .insert(productPayload(data));

  if (dbError) {
    if (dbError.code === "23505") {
      return {
        error:
          "같은 SKU, 공급처, 색상/옵션/사이즈 조합이 이미 등록되어 있습니다.",
      };
    }
    return { error: "제품 등록에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/products");
  revalidatePath("/products/key-stock");
  redirect("/products");
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "수정할 제품을 찾을 수 없습니다." };

  const data = parseProductForm(formData);
  const error = validateProduct(data);
  if (error) return { error };

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { error: dbError } = await supabase
    .from("products")
    .update({ ...productPayload(data), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (dbError) {
    if (dbError.code === "23505") {
      return {
        error:
          "같은 SKU, 공급처, 색상/옵션/사이즈 조합이 이미 등록되어 있습니다.",
      };
    }
    return { error: "제품 수정에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}/edit`);
  revalidatePath("/products/key-stock");
  redirect("/products");
}

export type ProductInlineField =
  | "supplier"
  | "category"
  | "brand"
  | "product_name"
  | "model_name"
  | "sku"
  | "stock_floor3"
  | "stock_b1"
  | "stock_display"
  | "stock_quantity"
  | "sale_price"
  | "purchase_price";

export async function updateProductField(
  productId: string,
  field: ProductInlineField,
  rawValue: string,
): Promise<{ error?: string }> {
  if (!productId) {
    return { error: "수정할 제품을 찾을 수 없습니다." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "제품을 찾을 수 없습니다." };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  switch (field) {
    case "supplier": {
      const supplier = rawValue.trim();
      if (!supplier) return { error: "공급처를 입력해 주세요." };
      updateData.supplier = supplier;
      break;
    }
    case "category":
      updateData.category = rawValue.trim() || null;
      break;
    case "brand":
      updateData.brand = rawValue.trim() || null;
      break;
    case "product_name": {
      const product_name = rawValue.trim();
      if (!product_name) return { error: "제품명을 입력해 주세요." };
      updateData.product_name = product_name;
      break;
    }
    case "model_name": {
      const model_name = rawValue.trim();
      if (!model_name) return { error: "모델명을 입력해 주세요." };
      updateData.model_name = model_name;
      break;
    }
    case "sku": {
      const sku = rawValue.trim();
      if (!sku) return { error: "SKU(모델번호)를 입력해 주세요." };
      updateData.sku = sku;
      break;
    }
    case "stock_floor3":
    case "stock_b1":
    case "stock_display": {
      const locationValue = Number(rawValue);
      if (Number.isNaN(locationValue) || locationValue < 0) {
        return { error: "재고는 0 이상 숫자여야 합니다." };
      }

      const stockBefore = product.stock_quantity;
      updateData[field] = locationValue;
      updateData.stock_quantity =
        field === "stock_floor3"
          ? locationValue + product.stock_b1 + product.stock_display
          : field === "stock_b1"
            ? product.stock_floor3 + locationValue + product.stock_display
            : product.stock_floor3 + product.stock_b1 + locationValue;

      const stockAfter = updateData.stock_quantity as number;
      if (stockBefore !== stockAfter) {
        const movementResult = await recordStockMovement(supabase, {
          product_id: productId,
          movement_type: "adjust",
          quantity: Math.abs(stockAfter - stockBefore),
          stock_before: stockBefore,
          stock_after: stockAfter,
          note: `목록에서 ${field} 수정`,
        });

        if ("error" in movementResult) {
          return { error: movementResult.error };
        }
      }
      break;
    }
    case "stock_quantity": {
      const stock_quantity = Number(rawValue);
      if (Number.isNaN(stock_quantity) || stock_quantity < 0) {
        return { error: "재고는 0 이상 숫자여야 합니다." };
      }

      const stockBefore = product.stock_quantity;
      if (stockBefore === stock_quantity) break;

      const delta = stock_quantity - stockBefore;
      const locationField =
        STOCK_LOCATION_FIELD[normalizeStockLocation(product.stock_location)];

      const currentLocationStock = product[locationField as StockLocationField] as number;
      const nextLocationStock = currentLocationStock + delta;
      if (nextLocationStock < 0) {
        return { error: "해당 위치 재고가 0 미만이 됩니다." };
      }

      updateData[locationField] = nextLocationStock;
      updateData.stock_quantity = stock_quantity;

      const movementResult = await recordStockMovement(supabase, {
        product_id: productId,
        movement_type: "adjust",
        quantity: Math.abs(delta),
        stock_before: stockBefore,
        stock_after: stock_quantity,
        note: "목록에서 합계 재고 수정",
      });

      if ("error" in movementResult) {
        return { error: movementResult.error };
      }
      break;
    }
    case "sale_price":
    case "purchase_price": {
      const price = Number(rawValue.replace(/,/g, ""));
      if (Number.isNaN(price) || price < 0) {
        return { error: "가격은 0 이상 숫자여야 합니다." };
      }
      updateData[field] = price;
      break;
    }
    default:
      return { error: "수정할 수 없는 항목입니다." };
  }

  const { error: dbError } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (dbError) {
    if (dbError.code === "23505") {
      return {
        error:
          "같은 SKU, 공급처, 색상/옵션/사이즈 조합이 이미 등록되어 있습니다.",
      };
    }
    return { error: "수정에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/products/key-stock");
  revalidatePath("/dashboard");

  return {};
}

export async function updateStock(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stock_quantity = Number(formData.get("stock_quantity") ?? 0);

  if (!id) return;
  if (stock_quantity < 0 || Number.isNaN(stock_quantity)) return;

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return;

  const { data: product } = await supabase
    .from("products")
    .select(
      "stock_quantity, stock_location, stock_floor3, stock_b1, stock_display",
    )
    .eq("id", id)
    .single();

  if (!product) return;

  const stockBefore = product.stock_quantity;
  if (stockBefore === stock_quantity) return;

  const delta = stock_quantity - stockBefore;
  const locationField =
    STOCK_LOCATION_FIELD[normalizeStockLocation(product.stock_location)];
  const currentLocationStock = product[locationField as StockLocationField] as number;
  const nextLocationStock = currentLocationStock + delta;
  if (nextLocationStock < 0) return;

  const movementResult = await recordStockMovement(supabase, {
    product_id: id,
    movement_type: "adjust",
    quantity: Math.abs(delta),
    stock_before: stockBefore,
    stock_after: stock_quantity,
    note: "대시보드에서 직접 수정",
  });

  if ("error" in movementResult) return;

  await supabase
    .from("products")
    .update({
      [locationField]: nextLocationStock,
      stock_quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/products/key-stock");
  revalidatePath("/dashboard");
}

export async function registerStockMovement(formData: FormData) {
  const product_id = String(formData.get("product_id") ?? "");
  const movement_type = String(formData.get("movement_type") ?? "") as
    | "in"
    | "out";
  const quantity = Number(formData.get("quantity") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  if (!product_id) return { error: "제품을 선택해 주세요." };
  if (movement_type !== "in" && movement_type !== "out") {
    return { error: "입고 또는 출고를 선택해 주세요." };
  }
  if (!quantity || quantity <= 0 || Number.isNaN(quantity)) {
    return { error: "수량은 1 이상 입력해 주세요." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { data: product } = await supabase
    .from("products")
    .select(
      "stock_quantity, stock_location, stock_floor3, stock_b1, stock_display",
    )
    .eq("id", product_id)
    .single();

  if (!product) return { error: "제품을 찾을 수 없습니다." };

  const stockBefore = product.stock_quantity;
  let locationPatch: Pick<
    typeof product,
    "stock_floor3" | "stock_b1" | "stock_display"
  >;

  if (movement_type === "in") {
    locationPatch = addLocationStock(product, quantity);
  } else {
    const deducted = deductLocationStock(product, quantity);
    if (!deducted) {
      return {
        error: `재고가 부족합니다. (현재 ${stockBefore}개, 출고 ${quantity}개)`,
      };
    }
    locationPatch = deducted;
  }

  const stockAfter = sumLocationStock({ ...product, ...locationPatch });

  const movementResult = await recordStockMovement(supabase, {
    product_id,
    movement_type,
    quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    note: note || null,
  });

  if ("error" in movementResult) {
    return { error: movementResult.error };
  }

  await supabase
    .from("products")
    .update({
      ...locationPatch,
      stock_quantity: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product_id);

  revalidatePath("/products");
  revalidatePath("/products/stock");
  revalidatePath("/products/history");
  revalidatePath("/products/key-stock");
  revalidatePath("/dashboard");

  redirect("/products/history");
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return;

  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/products");
}

export async function deleteProductsByIds(
  ids: string[],
): Promise<{ error?: string }> {
  if (!ids.length) {
    return { error: "삭제할 제품이 없습니다." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { error } = await supabase.from("products").delete().in("id", ids);

  if (error) {
    console.error("deleteProductsByIds error:", error);
    return { error: "제품 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return {};
}

export async function restoreProducts(
  products: {
    id: string;
    sku: string;
    product_name: string;
    model_name: string;
    brand: string | null;
    category: string | null;
    supplier: string;
    color: string | null;
    product_option: string | null;
    size: string | null;
    purchase_price: number;
    sale_price: number;
    stock_quantity: number;
    min_stock_quantity: number;
    created_at: string;
    updated_at: string;
  }[],
): Promise<{ error?: string }> {
  if (!products.length) {
    return { error: "복원할 제품이 없습니다." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  for (const product of products) {
    const { error } = await supabase.from("products").insert({
      id: product.id,
      sku: product.sku,
      product_name: product.product_name,
      model_name: product.model_name,
      brand: product.brand,
      category: product.category,
      supplier: product.supplier,
      color: product.color,
      product_option: product.product_option,
      size: product.size,
      purchase_price: Number(product.purchase_price) || 0,
      sale_price: Number(product.sale_price) || 0,
      stock_quantity: Number(product.stock_quantity) || 0,
      min_stock_quantity: Number(product.min_stock_quantity) || 0,
      created_at: product.created_at,
      updated_at: product.updated_at,
    });

    if (error) {
      console.error("restoreProducts error:", error);
      return {
        error: "제품 복원에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return {};
}

export async function pasteProducts(
  items: {
    sku: string;
    product_name: string;
    model_name: string;
    brand: string | null;
    category: string | null;
    supplier: string;
    color: string | null;
    product_option: string | null;
    size: string | null;
    purchase_price: number;
    sale_price: number;
    stock_quantity: number;
    min_stock_quantity: number;
  }[],
): Promise<{ ids?: string[]; error?: string }> {
  if (!items.length) {
    return { error: "붙여넣을 제품이 없습니다." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const ids: string[] = [];

  const { data: existingProducts } = await supabase
    .from("products")
    .select("sku");

  const existingSkus = new Set(
    (existingProducts ?? []).map((product) => product.sku),
  );
  const batchUsed = new Map<string, number>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pasteSku = nextPasteSku(item.sku, existingSkus, batchUsed);

    const { data, error: dbError } = await supabase
      .from("products")
      .insert({
        sku: pasteSku,
        product_name: item.product_name,
        model_name: item.model_name,
        brand: item.brand || null,
        category: item.category || null,
        supplier: item.supplier,
        color: item.color || null,
        product_option: item.product_option || null,
        size: item.size || null,
        purchase_price: Number(item.purchase_price) || 0,
        sale_price: Number(item.sale_price) || 0,
        stock_quantity: Number(item.stock_quantity) || 0,
        min_stock_quantity: Number(item.min_stock_quantity) || 0,
      })
      .select("id")
      .single();

    if (dbError || !data) {
      console.error("pasteProducts error:", dbError);
      return {
        error:
          dbError?.code === "23505"
            ? "같은 SKU 조합이 이미 있어 붙여넣기에 실패했습니다."
            : "제품 붙여넣기에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    ids.push(data.id);
    existingSkus.add(pasteSku);
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { ids };
}

export async function updateKeyStockReserved(
  productId: string,
  rawValue: string,
): Promise<{ error?: string }> {
  if (!productId) {
    return { error: "수정할 제품을 찾을 수 없습니다." };
  }

  const reserved_quantity = Number(rawValue);
  if (Number.isNaN(reserved_quantity) || reserved_quantity < 0) {
    return { error: "예약 수량은 0 이상 숫자여야 합니다." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity, is_key_stock")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "제품을 찾을 수 없습니다." };
  }

  if (!product.is_key_stock) {
    return { error: "주요 재고 제품만 예약 수량을 수정할 수 있습니다." };
  }

  if (reserved_quantity > product.stock_quantity) {
    return { error: "예약 수량은 총 재고(3층+B1+의왕) 이하로 입력해 주세요." };
  }

  const { error } = await supabase
    .from("products")
    .update({
      reserved_quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    return { error: "예약 수량 수정에 실패했습니다." };
  }

  revalidatePath("/products/key-stock");

  return {};
}

export async function toggleKeyStock(
  productId: string,
): Promise<{ error?: string; is_key_stock?: boolean }> {
  if (!productId) {
    return { error: "수정할 제품을 찾을 수 없습니다." };
  }

  const supabase = await createClient();
  const denied = await ensureManageProducts(supabase);
  if (denied) return denied;

  const { data: product } = await supabase
    .from("products")
    .select("is_key_stock")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "제품을 찾을 수 없습니다." };
  }

  const next = !product.is_key_stock;

  const { error } = await supabase
    .from("products")
    .update({
      is_key_stock: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    return { error: "주요 재고 설정 변경에 실패했습니다." };
  }

  revalidatePath("/products");
  revalidatePath("/products/key-stock");

  return { is_key_stock: next };
}
