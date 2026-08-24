"use server";

import { calculateSaleAmounts } from "@/lib/sales-calculator";
import { resolveSaleCategory } from "@/lib/sale-category-options";
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
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type SaleMutationSupabase = Awaited<ReturnType<typeof createClient>>;

function normalizeOptionalUserId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    return null;
  }
  return trimmed;
}

function formatSaleUpdateError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("shipping_cost")) {
    return "sales 테이블에 shipping_cost 컬럼이 없습니다. supabase/schema-sales-shipping-cost.sql을 실행해 주세요.";
  }
  if (message.includes("customer_phone") || message.includes("customer_address")) {
    return "sales 테이블에 고객 연락처 컬럼이 없습니다. supabase/schema-sales-update.sql을 실행해 주세요.";
  }
  if (message.includes("created_by_name") || message.includes("created_by_user_id")) {
    return "sales 테이블에 담당자 컬럼이 없습니다. supabase/schema-sales.sql을 확인해 주세요.";
  }
  if (message.includes("sale_category") || message.includes("check constraint")) {
    return "판매 구분 값이 올바르지 않습니다. 설정에서 사용 중인 구분을 확인해 주세요.";
  }
  if (message.includes("row-level security") || message.includes("policy")) {
    return "판매 수정 권한(RLS)이 없습니다. supabase/schema-sales-edit.sql을 실행해 주세요.";
  }
  if (message) {
    return `판매 수정에 실패했습니다. (${message})`;
  }
  return "판매 수정에 실패했습니다. Supabase에서 sales 테이블 수정 권한(RLS)을 확인해 주세요.";
}

async function getSaleMutationSupabase(): Promise<
  { error: string } | { supabase: SaleMutationSupabase }
> {
  const auth = await requirePermission("manageSales");
  if ("error" in auth) {
    return { error: auth.error ?? "이 작업을 할 권한이 없습니다." };
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { supabase: createAdminClient() as SaleMutationSupabase };
  }

  return { supabase: await createClient() };
}

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
  unit_purchase_price: number;
  payment_method_id: string;
  fulfillment_location: ReturnType<typeof parseFulfillmentLocation>;
  shipping_cost: number;
};

type PreparedCreateSaleLine = {
  line: SaleLineInput;
  lineNumber: number;
  product: {
    product_name: string;
    stock_quantity: number;
  };
  paymentMethod: {
    name: string;
    fee_rate: number;
  };
  unit_purchase_price: number;
  totalAmount: number;
  paymentFeeAmount: number;
  marginAmount: number;
  stockOutQuantity: number;
  lineNote: string | null;
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

    for (const row of parsed) {
      const record = row as Record<string, unknown>;
      const product_id = String(record.product_id ?? "").trim();
      if (!product_id) continue;

      const lineNumber = lines.length + 1;
      const quantity = Number(record.quantity ?? 0);
      const unit_sale_price = Number(record.unit_sale_price ?? 0);
      const unit_purchase_price = Math.max(
        0,
        Number(record.unit_purchase_price ?? 0),
      );
      const payment_method_id = String(record.payment_method_id ?? "").trim();
      const fulfillment_location = parseFulfillmentLocation(
        record.fulfillment_location,
      );
      const shipping_cost = Math.max(0, Number(record.shipping_cost ?? 0));

      if (!quantity || quantity <= 0) {
        return { error: `${lineNumber}번째 줄: 수량은 1 이상 입력해 주세요.` };
      }
      if (unit_sale_price < 0) {
        return { error: `${lineNumber}번째 줄: 판매단가는 0 이상이어야 합니다.` };
      }
      if (unit_purchase_price < 0) {
        return { error: `${lineNumber}번째 줄: 매입가는 0 이상이어야 합니다.` };
      }
      if (!payment_method_id) {
        return { error: `${lineNumber}번째 줄: 결제 방식을 선택해 주세요.` };
      }

      lines.push({
        product_id,
        quantity,
        unit_sale_price,
        unit_purchase_price,
        payment_method_id,
        fulfillment_location,
        shipping_cost,
      });
    }

    if (lines.length === 0) {
      return { error: "판매 제품을 1개 이상 추가해 주세요." };
    }

    return lines;
  } catch {
    return { error: "판매 제품 정보가 올바르지 않습니다." };
  }
}

async function prepareCreateSaleLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parsedLines: SaleLineInput[],
  note: string,
): Promise<PreparedCreateSaleLine[] | { error: string }> {
  const prepared: PreparedCreateSaleLine[] = [];

  for (let index = 0; index < parsedLines.length; index += 1) {
    const line = parsedLines[index];
    const lineNumber = index + 1;

    const { data: product } = await supabase
      .from("products")
      .select("product_name, stock_quantity")
      .eq("id", line.product_id)
      .single();

    if (!product) {
      return { error: `${lineNumber}번째 줄: 제품을 찾을 수 없습니다.` };
    }

    const fromStore = isStoreFulfillment(line.fulfillment_location);

    const { data: paymentMethod } = await supabase
      .from("payment_methods")
      .select("name, fee_rate")
      .eq("id", line.payment_method_id)
      .single();

    if (!paymentMethod) {
      return { error: `${lineNumber}번째 줄: 결제 방식을 찾을 수 없습니다.` };
    }

    const unit_purchase_price = line.unit_purchase_price;
    const { totalAmount, paymentFeeAmount, marginAmount } = calculateSaleAmounts({
      quantity: line.quantity,
      unitSalePrice: line.unit_sale_price,
      unitPurchasePrice: unit_purchase_price,
      feeRate: Number(paymentMethod.fee_rate) || 0,
      shippingCost: line.shipping_cost,
    });

    const fulfillmentNote = fromStore ? null : "출고: 직발송";
    const lineNote =
      [note || null, fulfillmentNote].filter(Boolean).join(" / ") || null;

    const stockOutQuantity = fromStore ? line.quantity : 0;

    if (stockOutQuantity > 0 && product.stock_quantity < stockOutQuantity) {
      return {
        error: `${lineNumber}번째 줄 (${product.product_name}): 재고가 부족합니다. (현재 ${product.stock_quantity}개)`,
      };
    }

    prepared.push({
      line,
      lineNumber,
      product,
      paymentMethod,
      unit_purchase_price,
      totalAmount,
      paymentFeeAmount,
      marginAmount,
      stockOutQuantity,
      lineNote,
    });
  }

  return prepared;
}

export async function createSale(formData: FormData) {
  const sale_category_raw = String(formData.get("sale_category") ?? "");
  const sold_at = String(formData.get("sold_at") ?? "").trim();
  const lines_json = String(formData.get("lines_json") ?? "");
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const business_partner = String(formData.get("business_partner") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const customer_address = String(formData.get("customer_address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const parsedLines = parseSaleLinesJson(lines_json);
  if ("error" in parsedLines) return { error: parsedLines.error };

  if (!sold_at) return { error: "판매 날짜를 입력해 주세요." };

  const supabase = await createClient();
  const sale_category = await resolveSaleCategory(supabase, sale_category_raw);
  if (!sale_category) return { error: "구분을 선택해 주세요." };

  const modifier = await requirePermission("createSales");
  if ("error" in modifier) return { error: modifier.error };

  const preparedLines = await prepareCreateSaleLines(
    supabase,
    parsedLines,
    note,
  );
  if ("error" in preparedLines) return { error: preparedLines.error };

  const stockNote = `판매 출고${customer_name ? ` — ${customer_name}` : ""}`;

  for (const prepared of preparedLines) {
    const { line, lineNumber, product, paymentMethod } = prepared;

    if (prepared.stockOutQuantity > 0) {
      const stockResult = await recordStockOutForSale(
        supabase,
        line.product_id,
        prepared.stockOutQuantity,
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
      unit_purchase_price: prepared.unit_purchase_price,
      customer_name: customer_name || null,
      business_partner: business_partner || null,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      payment_method: paymentMethod.name,
      payment_fee_rate: paymentMethod.fee_rate,
      payment_fee_amount: prepared.paymentFeeAmount,
      total_amount: prepared.totalAmount,
      margin_amount: prepared.marginAmount,
      shipping_cost: line.shipping_cost,
      note: prepared.lineNote,
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
  const sale_id = String(formData.get("sale_id") ?? "").trim();
  const sale_category_raw = String(formData.get("sale_category") ?? "");
  const product_id = String(formData.get("product_id") ?? "");
  const sold_at = String(formData.get("sold_at") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const unit_sale_price = Math.max(
    0,
    Math.round(Number(formData.get("unit_sale_price") ?? 0)),
  );
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const business_partner = String(formData.get("business_partner") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const customer_address = String(formData.get("customer_address") ?? "").trim();
  const payment_method_id = String(formData.get("payment_method_id") ?? "");
  const shipping_cost = Math.max(0, Number(formData.get("shipping_cost") ?? 0));
  const note = String(formData.get("note") ?? "").trim();
  const created_by_name = String(formData.get("created_by_name") ?? "").trim();
  const created_by_user_id = normalizeOptionalUserId(
    String(formData.get("created_by_user_id") ?? ""),
  );

  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };
  if (!created_by_name) return { error: "담당자를 선택해 주세요." };
  if (!product_id) return { error: "제품을 선택해 주세요." };

  const mutation = await getSaleMutationSupabase();
  if ("error" in mutation) return { error: mutation.error };

  const supabase = mutation.supabase;
  const sale_category = await resolveSaleCategory(supabase, sale_category_raw);
  if (!sale_category) return { error: "구분을 선택해 주세요." };
  if (!sold_at) return { error: "판매 날짜를 입력해 주세요." };
  if (!quantity || quantity <= 0) return { error: "수량은 1 이상 입력해 주세요." };
  if (Number.isNaN(unit_sale_price)) {
    return { error: "판매 단가를 올바르게 입력해 주세요." };
  }
  if (unit_sale_price < 0) return { error: "소비자가는 0 이상이어야 합니다." };
  if (!payment_method_id) return { error: "결제 방식을 선택해 주세요." };

  const { data: existingSale } = await supabase
    .from("sales")
    .select("id, product_id, quantity, customer_name, unit_purchase_price")
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

  const unit_purchase_price =
    product_id === existingSale.product_id
      ? Math.max(
          0,
          Math.round(Number(existingSale.unit_purchase_price) || 0),
        ) || Math.max(0, Math.round(Number(product.purchase_price) || 0))
      : Math.max(0, Math.round(Number(product.purchase_price) || 0));
  const { totalAmount, paymentFeeAmount, marginAmount } = calculateSaleAmounts({
    quantity,
    unitSalePrice: unit_sale_price,
    unitPurchasePrice: unit_purchase_price,
    feeRate: Number(paymentMethod.fee_rate) || 0,
    shippingCost: shipping_cost,
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
      shipping_cost,
      note: note || null,
      created_by_name,
      created_by_user_id,
    })
    .eq("id", sale_id);

  if (updateError) {
    return { error: formatSaleUpdateError(updateError) };
  }

  const { data: verified, error: verifyError } = await supabase
    .from("sales")
    .select("sold_at, quantity, product_id, sale_category, unit_sale_price")
    .eq("id", sale_id)
    .single();

  if (verifyError || !verified) {
    return {
      error:
        "판매 수정 결과를 확인하지 못했습니다. Supabase SQL Editor에서 supabase/schema-sales-edit.sql을 실행해 주세요.",
    };
  }

  const verifiedSoldAt = String(verified.sold_at).slice(0, 10);
  if (
    verifiedSoldAt !== sold_at ||
    verified.quantity !== quantity ||
    verified.product_id !== product_id ||
    verified.sale_category !== sale_category ||
    Math.round(Number(verified.unit_sale_price) || 0) !== unit_sale_price
  ) {
    return {
      error:
        "판매 수정이 반영되지 않았습니다. Supabase SQL Editor에서 supabase/schema-sales-edit.sql을 실행해 주세요.",
    };
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function updateSalePurchasePrice(
  saleId: string,
  unitPurchasePrice: number,
): Promise<{ error?: string; ok?: boolean }> {
  const sale_id = saleId.trim();
  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };

  const unit_purchase_price = Math.max(0, Math.round(unitPurchasePrice));

  const mutation = await getSaleMutationSupabase();
  if ("error" in mutation) return { error: mutation.error };

  const supabase = mutation.supabase;

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, quantity, unit_sale_price, payment_fee_rate, payment_fee_amount, shipping_cost",
    )
    .eq("id", sale_id)
    .single();

  if (!sale) return { error: "판매 기록을 찾을 수 없습니다." };

  const { marginAmount } = calculateSaleAmounts({
    quantity: sale.quantity,
    unitSalePrice: Number(sale.unit_sale_price) || 0,
    unitPurchasePrice: unit_purchase_price,
    feeRate: Number(sale.payment_fee_rate) || 0,
    shippingCost: Number(sale.shipping_cost) || 0,
  });

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      unit_purchase_price,
      margin_amount: marginAmount,
    })
    .eq("id", sale_id);

  if (updateError) {
    return { error: formatSaleUpdateError(updateError) };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function updateSaleTotalAmount(
  saleId: string,
  totalAmount: number,
): Promise<{ error?: string; ok?: boolean }> {
  const sale_id = saleId.trim();
  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };

  const requestedTotal = Math.max(0, Math.round(totalAmount));

  const mutation = await getSaleMutationSupabase();
  if ("error" in mutation) return { error: mutation.error };

  const supabase = mutation.supabase;

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, quantity, unit_purchase_price, payment_fee_rate, shipping_cost",
    )
    .eq("id", sale_id)
    .single();

  if (!sale) return { error: "판매 기록을 찾을 수 없습니다." };
  if (!sale.quantity || sale.quantity <= 0) {
    return { error: "수량 정보가 올바르지 않습니다." };
  }

  const unit_sale_price = Math.round(requestedTotal / sale.quantity);
  const {
    totalAmount: normalizedTotal,
    paymentFeeAmount,
    marginAmount,
  } = calculateSaleAmounts({
    quantity: sale.quantity,
    unitSalePrice: unit_sale_price,
    unitPurchasePrice: Number(sale.unit_purchase_price) || 0,
    feeRate: Number(sale.payment_fee_rate) || 0,
    shippingCost: Number(sale.shipping_cost) || 0,
  });

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      unit_sale_price,
      total_amount: normalizedTotal,
      payment_fee_amount: paymentFeeAmount,
      margin_amount: marginAmount,
    })
    .eq("id", sale_id);

  if (updateError) {
    return { error: formatSaleUpdateError(updateError) };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function updateSaleShippingCost(
  saleId: string,
  shippingCost: number,
): Promise<{ error?: string; ok?: boolean }> {
  const sale_id = saleId.trim();
  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };

  const shipping_cost = Math.max(0, Math.round(shippingCost));

  const mutation = await getSaleMutationSupabase();
  if ("error" in mutation) return { error: mutation.error };

  const supabase = mutation.supabase;

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, quantity, unit_sale_price, unit_purchase_price, payment_fee_rate",
    )
    .eq("id", sale_id)
    .single();

  if (!sale) return { error: "판매 기록을 찾을 수 없습니다." };

  const { marginAmount } = calculateSaleAmounts({
    quantity: sale.quantity,
    unitSalePrice: Number(sale.unit_sale_price) || 0,
    unitPurchasePrice: Number(sale.unit_purchase_price) || 0,
    feeRate: Number(sale.payment_fee_rate) || 0,
    shippingCost: shipping_cost,
  });

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      shipping_cost,
      margin_amount: marginAmount,
    })
    .eq("id", sale_id);

  if (updateError) {
    return { error: formatSaleUpdateError(updateError) };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function updateSalePaymentMethod(
  saleId: string,
  paymentMethodId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const sale_id = saleId.trim();
  const payment_method_id = paymentMethodId.trim();

  if (!sale_id) return { error: "판매 기록을 찾을 수 없습니다." };
  if (!payment_method_id) return { error: "결제 방식을 선택해 주세요." };

  const mutation = await getSaleMutationSupabase();
  if ("error" in mutation) return { error: mutation.error };

  const supabase = mutation.supabase;

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("name, fee_rate")
    .eq("id", payment_method_id)
    .single();

  if (!paymentMethod) return { error: "결제 방식을 찾을 수 없습니다." };

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, quantity, unit_sale_price, unit_purchase_price, shipping_cost",
    )
    .eq("id", sale_id)
    .single();

  if (!sale) return { error: "판매 기록을 찾을 수 없습니다." };

  const feeRate = Number(paymentMethod.fee_rate) || 0;
  const { paymentFeeAmount, marginAmount } = calculateSaleAmounts({
    quantity: sale.quantity,
    unitSalePrice: Number(sale.unit_sale_price) || 0,
    unitPurchasePrice: Number(sale.unit_purchase_price) || 0,
    feeRate,
    shippingCost: Number(sale.shipping_cost) || 0,
  });

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      payment_method: paymentMethod.name,
      payment_fee_rate: feeRate,
      payment_fee_amount: paymentFeeAmount,
      margin_amount: marginAmount,
    })
    .eq("id", sale_id);

  if (updateError) {
    return { error: formatSaleUpdateError(updateError) };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function deleteSales(
  saleIds: string[],
): Promise<{ error?: string; ok?: boolean; deleted?: number; errors?: string[] }> {
  const uniqueIds = [...new Set(saleIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "삭제할 매출을 선택해 주세요." };
  }

  const supabase = await createClient();
  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error };

  let deleted = 0;
  const errors: string[] = [];

  for (const sale_id of uniqueIds) {
    const { data: existingSale } = await supabase
      .from("sales")
      .select("id, product_id, quantity, customer_name")
      .eq("id", sale_id)
      .single();

    if (!existingSale) {
      errors.push("이미 삭제된 매출이 포함되어 있습니다.");
      continue;
    }

    const stockNote = `판매 삭제${existingSale.customer_name ? ` — ${existingSale.customer_name}` : ""}`;
    const stockResult = await recordStockIn(
      supabase,
      existingSale.product_id,
      existingSale.quantity,
      stockNote,
    );

    if ("error" in stockResult) {
      errors.push(stockResult.error ?? "재고 복구에 실패했습니다.");
      continue;
    }

    const { error: deleteError } = await supabase
      .from("sales")
      .delete()
      .eq("id", sale_id);

    if (deleteError) {
      errors.push("매출 삭제에 실패했습니다.");
      continue;
    }

    deleted += 1;
  }

  if (deleted === 0) {
    return {
      error: errors[0] ?? "매출 삭제에 실패했습니다.",
      errors,
    };
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  return { ok: true, deleted, errors };
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
