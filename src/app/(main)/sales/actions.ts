"use server";

import { calculateSaleAmounts } from "@/lib/sales-calculator";
import { parseSaleCategory } from "@/lib/sale-categories";
import {
  isStoreFulfillment,
  parseFulfillmentLocation,
} from "@/lib/quote-fulfillment";
import { getModifierInfo, requirePermission } from "@/lib/profile";
import {
  addLocationStock,
  deductLocationStock,
  sumLocationStock,
} from "@/lib/stock-locations";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function recordStockOutForSale(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  if (!product) return { error: "제품을 찾을 수 없습니다." };

  const stockBefore = product.stock_quantity;
  const locationPatch = deductLocationStock(product, quantity);

  if (!locationPatch) {
    return {
      error: `재고가 부족합니다. (현재 ${stockBefore}개, 판매 ${quantity}개)`,
    };
  }

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
    return { error: "재고 출고 기록에 실패했습니다." };
  }

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

async function recordStockIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  if (!product) return { error: "제품을 찾을 수 없습니다." };

  const stockBefore = product.stock_quantity;
  const locationPatch = addLocationStock(product, quantity);
  const stockAfter = sumLocationStock({ ...product, ...locationPatch });

  const { error: movementError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    movement_type: "in",
    quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    note,
    modified_by_user_id: modifier.userId,
    modified_by_name: modifier.name,
  });

  if (movementError) {
    return { error: "재고 입고 기록에 실패했습니다." };
  }

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

async function applySaleStockChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  oldProductId: string,
  oldQuantity: number,
  newProductId: string,
  newQuantity: number,
  note: string,
) {
  if (oldProductId === newProductId) {
    const delta = newQuantity - oldQuantity;
    if (delta === 0) return { ok: true as const };
    if (delta > 0) {
      return recordStockOutForSale(supabase, newProductId, delta, `${note} (수량 증가)`);
    }
    return recordStockIn(supabase, newProductId, -delta, `${note} (수량 감소)`);
  }

  const restoreResult = await recordStockIn(
    supabase,
    oldProductId,
    oldQuantity,
    `${note} — 제품 변경 반환`,
  );
  if ("error" in restoreResult) return restoreResult;

  return recordStockOutForSale(
    supabase,
    newProductId,
    newQuantity,
    `${note} — 제품 변경 출고`,
  );
}

type SaleLineInput = {
  product_id: string;
  quantity: number;
  unit_sale_price: number;
  payment_method_id: string;
  fulfillment_location: ReturnType<typeof parseFulfillmentLocation>;
};

function parseSaleLinesJson(
  raw: string,
): SaleLineInput[] | { error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "판매 제품을 1개 이상 추가해 주세요." };
    }

    const lines: SaleLineInput[] = [];

    for (let index = 0; index < parsed.length; index += 1) {
      const row = parsed[index] as Record<string, unknown>;
      const lineNumber = index + 1;
      const product_id = String(row.product_id ?? "");
      const quantity = Number(row.quantity ?? 0);
      const unit_sale_price = Number(row.unit_sale_price ?? 0);
      const payment_method_id = String(row.payment_method_id ?? "");
      const fulfillment_location = parseFulfillmentLocation(row.fulfillment_location);

      if (!product_id) {
        return { error: `${lineNumber}번째 줄: 제품을 선택해 주세요.` };
      }
      if (!quantity || quantity <= 0) {
        return { error: `${lineNumber}번째 줄: 수량은 1 이상 입력해 주세요.` };
      }
      if (unit_sale_price < 0) {
        return { error: `${lineNumber}번째 줄: 판매단가는 0 이상이어야 합니다.` };
      }
      if (!payment_method_id) {
        return { error: `${lineNumber}번째 줄: 결제 방식을 선택해 주세요.` };
      }

      lines.push({
        product_id,
        quantity,
        unit_sale_price,
        payment_method_id,
        fulfillment_location,
      });
    }

    return lines;
  } catch {
    return { error: "판매 제품 정보가 올바르지 않습니다." };
  }
}

export async function createSale(formData: FormData) {
  const sale_category_raw = String(formData.get("sale_category") ?? "");
  const sale_category = parseSaleCategory(sale_category_raw);
  const sold_at = String(formData.get("sold_at") ?? "").trim();
  const lines_json = String(formData.get("lines_json") ?? "");
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const business_partner = String(formData.get("business_partner") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const customer_address = String(formData.get("customer_address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const parsedLines = parseSaleLinesJson(lines_json);
  if ("error" in parsedLines) return { error: parsedLines.error };

  if (!sale_category) return { error: "구분을 선택해 주세요." };
  if (!sold_at) return { error: "판매 날짜를 입력해 주세요." };

  const supabase = await createClient();
  const modifier = await requirePermission("createSales");
  if ("error" in modifier) return { error: modifier.error };

  const stockNote = `판매 출고${customer_name ? ` — ${customer_name}` : ""}`;

  for (let index = 0; index < parsedLines.length; index += 1) {
    const line = parsedLines[index];
    const lineNumber = index + 1;

    const { data: product } = await supabase
      .from("products")
      .select("product_name, purchase_price, stock_quantity")
      .eq("id", line.product_id)
      .single();

    if (!product) {
      return { error: `${lineNumber}번째 줄: 제품을 찾을 수 없습니다.` };
    }

    const fromStore = isStoreFulfillment(line.fulfillment_location);
    const stockQuantity = Number(product.stock_quantity) || 0;

    if (fromStore && stockQuantity > 0 && stockQuantity < line.quantity) {
      return {
        error: `${lineNumber}번째 줄 (${product.product_name}): 재고가 부족합니다. (현재 ${stockQuantity}개, 판매 ${line.quantity}개)`,
      };
    }

    const { data: paymentMethod } = await supabase
      .from("payment_methods")
      .select("name, fee_rate")
      .eq("id", line.payment_method_id)
      .single();

    if (!paymentMethod) {
      return { error: `${lineNumber}번째 줄: 결제 방식을 찾을 수 없습니다.` };
    }

    const unit_purchase_price = Number(product.purchase_price) || 0;
    const { totalAmount, paymentFeeAmount, marginAmount } = calculateSaleAmounts({
      quantity: line.quantity,
      unitSalePrice: line.unit_sale_price,
      unitPurchasePrice: unit_purchase_price,
      feeRate: Number(paymentMethod.fee_rate) || 0,
    });

    const fulfillmentNote = fromStore ? null : "출고: 직발송";
    const lineNote =
      [note || null, fulfillmentNote].filter(Boolean).join(" / ") || null;

    const stockOutQuantity =
      fromStore && stockQuantity > 0
        ? Math.min(line.quantity, stockQuantity)
        : 0;

    if (stockOutQuantity > 0) {
      const stockResult = await recordStockOutForSale(
        supabase,
        line.product_id,
        stockOutQuantity,
        stockNote,
      );

      if ("error" in stockResult) {
        return {
          error: `${lineNumber}번째 줄 (${product.product_name}): ${stockResult.error}`,
        };
      }
    }

    const { error: saleError } = await supabase.from("sales").insert({
      sold_at,
      sale_category,
      product_id: line.product_id,
      quantity: line.quantity,
      unit_sale_price: line.unit_sale_price,
      unit_purchase_price,
      customer_name: customer_name || null,
      business_partner: business_partner || null,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      payment_method: paymentMethod.name,
      payment_fee_rate: paymentMethod.fee_rate,
      payment_fee_amount: paymentFeeAmount,
      total_amount: totalAmount,
      margin_amount: marginAmount,
      note: lineNote,
      created_by_user_id: modifier.userId,
      created_by_name: modifier.name,
    });

    if (saleError) {
      return {
        error:
          `${lineNumber}번째 줄 저장에 실패했습니다. supabase/schema-sales.sql 및 schema-sales-category.sql을 실행했는지 확인해 주세요.`,
      };
    }
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  redirect("/sales");
}

export async function updateSale(formData: FormData) {
  const sale_id = String(formData.get("sale_id") ?? "");
  const sale_category_raw = String(formData.get("sale_category") ?? "");
  const sale_category = parseSaleCategory(sale_category_raw);
  const product_id = String(formData.get("product_id") ?? "");
  const sold_at = String(formData.get("sold_at") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const unit_sale_price = Number(formData.get("unit_sale_price") ?? 0);
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const business_partner = String(formData.get("business_partner") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const customer_address = String(formData.get("customer_address") ?? "").trim();
  const payment_method_id = String(formData.get("payment_method_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const created_by_name = String(formData.get("created_by_name") ?? "").trim();
  const created_by_user_id = String(formData.get("created_by_user_id") ?? "").trim();

  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };
  if (!created_by_name) return { error: "담당자를 선택해 주세요." };
  if (!sale_category) return { error: "구분을 선택해 주세요." };
  if (!product_id) return { error: "제품을 선택해 주세요." };
  if (!sold_at) return { error: "판매 날짜를 입력해 주세요." };
  if (!quantity || quantity <= 0) return { error: "수량은 1 이상 입력해 주세요." };
  if (unit_sale_price < 0) return { error: "소비자가는 0 이상이어야 합니다." };
  if (!payment_method_id) return { error: "결제 방식을 선택해 주세요." };

  const supabase = await createClient();
  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error };

  const { data: existingSale } = await supabase
    .from("sales")
    .select("id, product_id, quantity, customer_name")
    .eq("id", sale_id)
    .single();

  if (!existingSale) return { error: "판매 기록을 찾을 수 없습니다." };

  const { data: product } = await supabase
    .from("products")
    .select("product_name, purchase_price")
    .eq("id", product_id)
    .single();

  if (!product) return { error: "제품을 찾을 수 없습니다." };

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("name, fee_rate")
    .eq("id", payment_method_id)
    .single();

  if (!paymentMethod) return { error: "결제 방식을 찾을 수 없습니다." };

  const unit_purchase_price = Number(product.purchase_price) || 0;
  const { totalAmount, paymentFeeAmount, marginAmount } = calculateSaleAmounts({
    quantity,
    unitSalePrice: unit_sale_price,
    unitPurchasePrice: unit_purchase_price,
    feeRate: Number(paymentMethod.fee_rate) || 0,
  });

  const stockNote = `판매 수정${customer_name ? ` — ${customer_name}` : existingSale.customer_name ? ` — ${existingSale.customer_name}` : ""}`;

  const stockResult = await applySaleStockChange(
    supabase,
    existingSale.product_id,
    existingSale.quantity,
    product_id,
    quantity,
    stockNote,
  );

  if ("error" in stockResult) {
    return { error: stockResult.error };
  }

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      sold_at,
      sale_category,
      product_id,
      quantity,
      unit_sale_price,
      unit_purchase_price,
      customer_name: customer_name || null,
      business_partner: business_partner || null,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      payment_method: paymentMethod.name,
      payment_fee_rate: paymentMethod.fee_rate,
      payment_fee_amount: paymentFeeAmount,
      total_amount: totalAmount,
      margin_amount: marginAmount,
      note: note || null,
      created_by_name,
      created_by_user_id: created_by_user_id || null,
    })
    .eq("id", sale_id);

  if (updateError) {
    return {
      error:
        "판매 수정에 실패했습니다. Supabase에서 sales 테이블 수정 권한(RLS)을 확인해 주세요.",
    };
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function deleteSale(
  saleId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const sale_id = saleId.trim();
  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };

  const supabase = await createClient();
  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error };

  const { data: existingSale } = await supabase
    .from("sales")
    .select("id, product_id, quantity, customer_name")
    .eq("id", sale_id)
    .single();

  if (!existingSale) return { error: "판매 기록을 찾을 수 없습니다." };

  const stockNote = `판매 삭제${existingSale.customer_name ? ` — ${existingSale.customer_name}` : ""}`;

  const stockResult = await recordStockIn(
    supabase,
    existingSale.product_id,
    existingSale.quantity,
    stockNote,
  );

  if ("error" in stockResult) {
    return { error: stockResult.error };
  }

  const { error: deleteError } = await supabase.from("sales").delete().eq("id", sale_id);

  if (deleteError) {
    return {
      error:
        "판매 삭제에 실패했습니다. Supabase에서 sales 테이블 삭제 권한(RLS)을 확인해 주세요.",
    };
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  return { ok: true as const };
}
