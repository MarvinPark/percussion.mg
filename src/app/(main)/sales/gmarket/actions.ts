"use server";

import { mapEsmCommerceError } from "@/lib/esm-commerce/config";
import {
  createProductFromGmarketOrder,
  matchProductForGmarketOrder,
} from "@/lib/esm-commerce/create-product-from-order";
import { fetchGmarketOrders } from "@/lib/esm-commerce/orders";
import type { ProductMatchCandidate } from "@/lib/naver-commerce/match-product";
import { requirePermission } from "@/lib/profile";
import {
  buildSaleAmountsForLine,
  formatSaleInsertError,
  insertSaleRecord,
} from "@/lib/sale-recording";
import { createClient } from "@/lib/supabase/server";
import { DUPLICATE_SKU_MESSAGE } from "@/lib/product-duplicate";
import { revalidatePath } from "next/cache";

const GMARKET_SOURCE = "gmarket";
const GMARKET_PAY_METHOD = "G마켓";

export type GmarketImportPreviewItem = {
  productOrderId: string;
  soldAt: string;
  productName: string;
  productOption: string;
  sellerProductCode: string;
  quantity: number;
  totalPaymentAmount: number;
  customerName: string;
  customerPhone: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  alreadyImported: boolean;
};

export type GmarketImportResult = {
  imported: number;
  skippedExisting: number;
  skippedUnmatched: number;
  createdProducts: number;
  errors: string[];
};

export type GmarketImportOptions = {
  autoCreateProducts?: boolean;
  manualMatches?: Record<string, string>;
};

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  };
}

function parseDateRange(
  fromDate: string,
  toDate: string,
):
  | { ok: false; error: string }
  | { ok: true; fromDate: string; toDate: string } {
  const from = fromDate.trim();
  const to = toDate.trim();

  if (!from || !to) {
    return { ok: false, error: "조회 시작일과 종료일을 입력해 주세요." };
  }

  if (from > to) {
    return { ok: false, error: "시작일이 종료일보다 늦을 수 없습니다." };
  }

  const startMs = new Date(`${from}T00:00:00+09:00`).getTime();
  const endMs = new Date(`${to}T23:59:59+09:00`).getTime();
  const maxRangeMs = 31 * 24 * 60 * 60 * 1000;

  if (endMs - startMs > maxRangeMs) {
    return { ok: false, error: "한 번에 최대 31일까지 조회할 수 있습니다." };
  }

  return { ok: true, fromDate: from, toDate: to };
}

async function loadProducts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, product_name, model_name, purchase_price, sale_price");

  if (error) {
    throw new Error("제품 목록을 불러오지 못했습니다.");
  }

  return data ?? [];
}

async function loadExistingOrderIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderIds: string[],
  options?: { allowMissingSchema?: boolean },
) {
  if (orderIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("sales")
    .select("external_order_id")
    .eq("external_source", GMARKET_SOURCE)
    .in("external_order_id", orderIds);

  if (error) {
    const missingSchema =
      error.message.includes("external_source") ||
      error.message.includes("external_order_id");

    if (missingSchema && options?.allowMissingSchema) {
      return new Set<string>();
    }

    if (missingSchema) {
      throw new Error(
        "sales 테이블에 지마켓 연동 컬럼이 없습니다. supabase/schema-smartstore.sql을 실행해 주세요.",
      );
    }
    throw new Error("기존 매출 조회에 실패했습니다.");
  }

  return new Set(
    (data ?? [])
      .map((row) => row.external_order_id)
      .filter((value): value is string => Boolean(value)),
  );
}

async function loadGmarketPayMethod(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("name, fee_rate")
    .eq("name", GMARKET_PAY_METHOD)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "G마켓 결제 수단이 없습니다. supabase/schema-gmarket.sql을 실행해 주세요.",
    );
  }

  return data;
}

async function checkGmarketSchemaReady(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { error } = await supabase
    .from("sales")
    .select("external_source")
    .limit(1);

  return !error;
}

function buildGmarketSaleAmounts(
  quantity: number,
  unitSalePrice: number,
  unitPurchasePrice: number,
  paymentMethod: { name: string; fee_rate: number },
  serviceFee: number,
) {
  const base = buildSaleAmountsForLine(
    quantity,
    unitSalePrice,
    unitPurchasePrice,
    paymentMethod,
  );

  if (serviceFee <= 0) return base;

  const purchaseCost = unitPurchasePrice * quantity;
  return {
    totalAmount: base.totalAmount,
    paymentFeeAmount: serviceFee,
    marginAmount: base.totalAmount - serviceFee - purchaseCost,
  };
}

async function resolveProductForOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  products: ProductMatchCandidate[],
  order: {
    orderLineId: string;
    productName: string;
    productOption: string;
    sellerProductCode: string;
    quantity: number;
    totalPaymentAmount: number;
  },
  options: {
    autoCreateProducts: boolean;
    manualProductId?: string;
    createdProductIds: Set<string>;
  },
): Promise<
  | { product: ProductMatchCandidate; created: boolean }
  | { error: string }
  | null
> {
  if (options.manualProductId) {
    const manual = products.find((p) => p.id === options.manualProductId);
    if (!manual) {
      return { error: "선택한 제품을 찾을 수 없습니다." };
    }
    return { product: manual, created: false };
  }

  const matched = matchProductForGmarketOrder(products, order);
  if (matched) {
    return { product: matched, created: false };
  }

  if (!options.autoCreateProducts) {
    return null;
  }

  const created = await createProductFromGmarketOrder(supabase, order);
  if ("error" in created) {
    return created;
  }

  const isNew = !options.createdProductIds.has(created.id);
  options.createdProductIds.add(created.id);

  const existingIndex = products.findIndex((p) => p.id === created.id);
  if (existingIndex === -1) {
    products.push(created);
  } else {
    products[existingIndex] = created;
  }

  return { product: created, created: isNew };
}

export async function previewGmarketOrders(
  fromDate: string,
  toDate: string,
): Promise<
  | { error: string }
  | {
      items: GmarketImportPreviewItem[];
      fromDate: string;
      toDate: string;
      schemaReady: boolean;
    }
> {
  const supabase = await createClient();
  const auth = await requirePermission("createSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  const range = parseDateRange(fromDate, toDate);
  if (!range.ok) return { error: range.error };

  try {
    const [orders, products] = await Promise.all([
      fetchGmarketOrders(range.fromDate, range.toDate),
      loadProducts(supabase),
    ]);

    const existingIds = await loadExistingOrderIds(
      supabase,
      orders.map((order) => order.orderLineId),
      { allowMissingSchema: true },
    );

    const schemaReady = await checkGmarketSchemaReady(supabase);

    const items: GmarketImportPreviewItem[] = orders.map((order) => {
      const matched = matchProductForGmarketOrder(products, order);
      return {
        productOrderId: order.orderLineId,
        soldAt: order.soldAt,
        productName: order.productName,
        productOption: order.productOption,
        sellerProductCode: order.sellerProductCode,
        quantity: order.quantity,
        totalPaymentAmount: order.totalPaymentAmount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        matchedProductId: matched?.id ?? null,
        matchedProductName: matched?.product_name ?? null,
        alreadyImported: existingIds.has(order.orderLineId),
      };
    });

    return {
      items,
      fromDate: range.fromDate,
      toDate: range.toDate,
      schemaReady,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "주문 조회에 실패했습니다.";
    return { error: mapEsmCommerceError(message) };
  }
}

export async function importGmarketOrders(
  fromDate: string,
  toDate: string,
  options: GmarketImportOptions = {},
): Promise<{ error: string } | GmarketImportResult> {
  const autoCreateProducts = options.autoCreateProducts ?? true;
  const manualMatches = options.manualMatches ?? {};
  const supabase = await createClient();
  const auth = await requirePermission("createSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  const range = parseDateRange(fromDate, toDate);
  if (!range.ok) return { error: range.error };

  try {
    const [orders, products, paymentMethod] = await Promise.all([
      fetchGmarketOrders(range.fromDate, range.toDate),
      loadProducts(supabase),
      loadGmarketPayMethod(supabase),
    ]);

    const existingIds = await loadExistingOrderIds(
      supabase,
      orders.map((order) => order.orderLineId),
    );

    const result: GmarketImportResult = {
      imported: 0,
      skippedExisting: 0,
      skippedUnmatched: 0,
      createdProducts: 0,
      errors: [],
    };

    const createdProductIds = new Set<string>();

    for (const order of orders) {
      if (existingIds.has(order.orderLineId)) {
        result.skippedExisting += 1;
        continue;
      }

      const resolved = await resolveProductForOrder(
        supabase,
        products,
        order,
        {
          autoCreateProducts,
          manualProductId: manualMatches[order.orderLineId],
          createdProductIds,
        },
      );

      if (!resolved) {
        result.skippedUnmatched += 1;
        continue;
      }

      if ("error" in resolved) {
        result.errors.push(`${order.orderLineId}: ${resolved.error}`);
        continue;
      }

      const matched = resolved.product;
      if (resolved.created) {
        result.createdProducts += 1;
      }

      const unitSalePrice =
        order.quantity > 0
          ? Math.round(order.totalPaymentAmount / order.quantity)
          : order.totalPaymentAmount;

      const unitPurchasePrice = Number(matched.purchase_price) || 0;
      const { totalAmount, paymentFeeAmount, marginAmount } =
        buildGmarketSaleAmounts(
          order.quantity,
          unitSalePrice,
          unitPurchasePrice,
          paymentMethod,
          order.serviceFee,
        );

      const noteParts = [
        "지마켓",
        order.payNo ? `결제 ${order.payNo}` : null,
        order.productOption ? order.productOption : null,
      ].filter(Boolean);

      const insertResult = await insertSaleRecord(supabase, {
        sold_at: order.soldAt,
        product_id: matched.id,
        quantity: order.quantity,
        unit_sale_price: unitSalePrice,
        unit_purchase_price: unitPurchasePrice,
        customer_name: order.customerName || null,
        business_partner: null,
        customer_phone: order.customerPhone || null,
        customer_address: order.customerAddress || null,
        payment_method: paymentMethod.name,
        payment_fee_rate: Number(paymentMethod.fee_rate) || 0,
        payment_fee_amount: paymentFeeAmount,
        total_amount: totalAmount,
        margin_amount: marginAmount,
        note: noteParts.join(" · "),
        created_by_user_id: auth.userId,
        created_by_name: auth.name,
      });

      if ("error" in insertResult) {
        result.errors.push(
          `${order.orderLineId}: ${insertResult.error ?? formatSaleInsertError({})}`,
        );
        continue;
      }

      const { error: externalUpdateError } = await supabase
        .from("sales")
        .update({
          external_source: GMARKET_SOURCE,
          external_order_id: order.orderLineId,
        })
        .eq("id", insertResult.saleId);

      if (externalUpdateError) {
        await supabase.from("sales").delete().eq("id", insertResult.saleId);
        result.errors.push(
          `${order.orderLineId}: 지마켓 주문 ID 저장에 실패했습니다. schema-smartstore.sql 실행 여부를 확인해 주세요.`,
        );
        continue;
      }

      existingIds.add(order.orderLineId);
      result.imported += 1;
    }

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/products");

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "주문 가져오기에 실패했습니다.";
    return { error: mapEsmCommerceError(message) };
  }
}

export async function getGmarketDefaultRange() {
  return defaultDateRange();
}

export type GmarketLinkedProduct = {
  id: string;
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  keywords?: string | null;
};

export async function createProductForGmarketLink(input: {
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  product_option?: string;
}): Promise<{ error: string } | { product: GmarketLinkedProduct }> {
  const product_name = input.product_name.trim();
  const model_name = input.model_name.trim();
  const sku = input.sku.trim();
  const supplier = input.supplier.trim() || "지마켓";
  const product_option = input.product_option?.trim() || null;

  if (!product_name) return { error: "제품명을 입력해 주세요." };
  if (!model_name) return { error: "모델명을 입력해 주세요." };
  if (!sku) return { error: "SKU를 입력해 주세요." };
  if (input.sale_price < 0 || input.purchase_price < 0) {
    return { error: "가격은 0 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const auth = await requirePermission("createSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  const { data: existing } = await supabase
    .from("products")
    .select("id, product_name, model_name, sku, supplier, sale_price, purchase_price, stock_quantity, keywords")
    .eq("sku", sku)
    .eq("supplier", supplier)
    .maybeSingle();

  if (existing) {
    return {
      product: {
        id: existing.id,
        product_name: existing.product_name,
        model_name: existing.model_name,
        sku: existing.sku,
        supplier: existing.supplier,
        sale_price: Number(existing.sale_price) || 0,
        purchase_price: Number(existing.purchase_price) || 0,
        stock_quantity: Number(existing.stock_quantity) || 0,
        keywords: existing.keywords,
      },
    };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      sku,
      product_name,
      model_name,
      supplier,
      product_option,
      purchase_price: Math.round(input.purchase_price),
      sale_price: Math.round(input.sale_price),
      stock_quantity: 0,
      min_stock_quantity: 0,
      stock_floor3: 0,
      stock_b1: 0,
      stock_display: 0,
      stock_location: "3층",
      is_key_stock: false,
    })
    .select(
      "id, product_name, model_name, sku, supplier, sale_price, purchase_price, stock_quantity, keywords",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: DUPLICATE_SKU_MESSAGE };
    }
    return { error: "제품 등록에 실패했습니다." };
  }

  revalidatePath("/products");
  revalidatePath("/sales");

  return {
    product: {
      id: data.id,
      product_name: data.product_name,
      model_name: data.model_name,
      sku: data.sku,
      supplier: data.supplier,
      sale_price: Number(data.sale_price) || 0,
      purchase_price: Number(data.purchase_price) || 0,
      stock_quantity: Number(data.stock_quantity) || 0,
      keywords: data.keywords,
    },
  };
}
