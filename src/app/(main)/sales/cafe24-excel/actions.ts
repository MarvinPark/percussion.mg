"use server";

import { createProductFromCafe24Order } from "@/lib/cafe24-orders/create-product-from-order";
import type {
  Cafe24ExcelImportOptions,
  Cafe24ExcelImportPreviewItem,
  Cafe24ExcelImportResult,
  ParsedCafe24OrderRow,
} from "@/lib/cafe24-orders/types";
import {
  loadAllProductMatchCandidates,
  resolveManualProductMatch,
} from "@/lib/marketplace-product-loader";
import { matchProductForSmartstoreOrder } from "@/lib/naver-commerce/match-product";
import type { ProductMatchCandidate } from "@/lib/naver-commerce/match-product";
import {
  isStoreFulfillment,
  parseFulfillmentLocation,
  DEFAULT_FULFILLMENT_LOCATION,
  type FulfillmentLocation,
} from "@/lib/quote-fulfillment";
import { requirePermission } from "@/lib/profile";
import {
  buildSaleAmountsForLine,
  formatSaleInsertError,
  insertSaleRecord,
  recordStockOutForSale,
} from "@/lib/sale-recording";
import { createClient } from "@/lib/supabase/server";
import { DUPLICATE_SKU_MESSAGE } from "@/lib/product-duplicate";
import { revalidatePath } from "next/cache";
import type { SaleProductOption } from "@/types/sale";
import { SALE_PRODUCT_OPTION_SELECT } from "@/types/sale";

const CAFE24_EXCEL_SOURCE = "cafe24-excel";

async function loadProducts(supabase: Awaited<ReturnType<typeof createClient>>) {
  return loadAllProductMatchCandidates(supabase);
}

async function loadExistingLineIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lineIds: string[],
  options?: { allowMissingSchema?: boolean },
) {
  if (lineIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("sales")
    .select("external_order_id")
    .eq("external_source", CAFE24_EXCEL_SOURCE)
    .in("external_order_id", lineIds);

  if (error) {
    const missingSchema =
      error.message.includes("external_source") ||
      error.message.includes("external_order_id");

    if (missingSchema && options?.allowMissingSchema) {
      return new Set<string>();
    }

    if (missingSchema) {
      throw new Error(
        "sales 테이블에 외부 주문 연동 컬럼이 없습니다. supabase/schema-smartstore.sql을 실행해 주세요.",
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

async function checkExternalSchemaReady(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { error } = await supabase
    .from("sales")
    .select("external_source")
    .limit(1);

  return !error;
}

async function loadPaymentMethodById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentMethodId: string,
) {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, fee_rate")
    .eq("id", paymentMethodId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function buildImportNote(
  order: ParsedCafe24OrderRow,
  fulfillmentLocation: FulfillmentLocation,
) {
  const baseNote = [
    order.orderNo ? `주문 ${order.orderNo}` : null,
    order.cafe24PaymentMethod ? `카페24 ${order.cafe24PaymentMethod}` : null,
    order.paymentProvider ? order.paymentProvider : null,
    order.productOption ? order.productOption : null,
    order.note ? order.note : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const fulfillmentNote = isStoreFulfillment(fulfillmentLocation)
    ? null
    : "출고: 직발송";

  return [baseNote || null, fulfillmentNote].filter(Boolean).join(" / ") || null;
}

async function resolveProductForOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  products: ProductMatchCandidate[],
  order: ParsedCafe24OrderRow,
  options: {
    autoCreateProducts: boolean;
    manualProductId?: string;
    skipAutoMatch?: boolean;
    createdProductIds: Set<string>;
  },
): Promise<
  | { product: ProductMatchCandidate; created: boolean }
  | { error: string }
  | null
> {
  if (options.manualProductId) {
    const manual = await resolveManualProductMatch(
      supabase,
      products,
      options.manualProductId,
    );
    if (!manual) {
      return { error: "선택한 제품을 찾을 수 없습니다." };
    }
    return { product: manual, created: false };
  }

  const matched = options.skipAutoMatch
    ? null
    : matchProductForSmartstoreOrder(products, {
        sellerProductCode: order.sellerProductCode,
        productName: order.productName,
        productOption: order.productOption,
      });

  if (matched) {
    return { product: matched, created: false };
  }

  if (!options.autoCreateProducts) {
    return null;
  }

  const created = await createProductFromCafe24Order(supabase, order);
  if ("error" in created) {
    return created;
  }

  const isNew = !options.createdProductIds.has(created.id);
  options.createdProductIds.add(created.id);

  const existingIndex = products.findIndex((product) => product.id === created.id);
  if (existingIndex === -1) {
    products.push(created);
  } else {
    products[existingIndex] = created;
  }

  return { product: created, created: isNew };
}

function buildPreviewItems(
  rows: ParsedCafe24OrderRow[],
  products: ProductMatchCandidate[],
  existingIds: Set<string>,
): Cafe24ExcelImportPreviewItem[] {
  return rows.map((row) => {
    const matched = matchProductForSmartstoreOrder(products, {
      sellerProductCode: row.sellerProductCode,
      productName: row.productName,
      productOption: row.productOption,
    });

    return {
      ...row,
      matchedProductId: matched?.id ?? null,
      matchedProductName: matched?.product_name ?? null,
      matchedProductModelName: matched?.model_name ?? null,
      matchedProductBrand: matched?.brand ?? null,
      matchedProductSku: matched?.sku ?? null,
      matchedProductPurchasePrice: matched
        ? Number(matched.purchase_price) || 0
        : null,
      alreadyImported: existingIds.has(row.lineId),
    };
  });
}

export async function previewCafe24ExcelImport(
  rows: ParsedCafe24OrderRow[],
): Promise<
  | { error: string }
  | {
      items: Cafe24ExcelImportPreviewItem[];
      schemaReady: boolean;
      totalRows: number;
    }
> {
  const supabase = await createClient();
  const auth = await requirePermission("createSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  if (rows.length === 0) {
    return { error: "등록할 주문 행이 없습니다." };
  }

  try {
    const products = await loadProducts(supabase);
    const existingIds = await loadExistingLineIds(
      supabase,
      rows.map((row) => row.lineId),
      { allowMissingSchema: true },
    );
    const schemaReady = await checkExternalSchemaReady(supabase);

    return {
      items: buildPreviewItems(rows, products, existingIds),
      schemaReady,
      totalRows: rows.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "미리보기 생성에 실패했습니다.";
    return { error: message };
  }
}

export async function importCafe24ExcelOrders(
  rows: ParsedCafe24OrderRow[],
  options: Cafe24ExcelImportOptions = {},
): Promise<{ error: string } | Cafe24ExcelImportResult> {
  const autoCreateProducts = options.autoCreateProducts ?? true;
  const manualMatches = options.manualMatches ?? {};
  const dismissedAutoMatches = new Set(options.dismissedAutoMatches ?? []);
  const paymentMethodIds = options.paymentMethodIds ?? {};
  const fulfillmentLocations = options.fulfillmentLocations ?? {};
  const purchasePrices = options.purchasePrices ?? {};
  const shippingCosts = options.shippingCosts ?? {};

  const supabase = await createClient();
  const auth = await requirePermission("createSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  if (rows.length === 0) {
    return { error: "등록할 주문 행이 없습니다." };
  }

  try {
    const products = await loadProducts(supabase);
    const existingIds = await loadExistingLineIds(
      supabase,
      rows.map((row) => row.lineId),
    );

    const previewItems = buildPreviewItems(rows, products, existingIds);
    const previewByLineId = new Map(
      previewItems.map((item) => [item.lineId, item]),
    );

    const result: Cafe24ExcelImportResult = {
      imported: 0,
      skippedExisting: 0,
      skippedUnmatched: 0,
      skippedMissingPayment: 0,
      createdProducts: 0,
      errors: [],
    };

    const createdProductIds = new Set<string>();
    const paymentMethodCache = new Map<
      string,
      { name: string; fee_rate: number }
    >();

    for (const order of rows) {
      if (existingIds.has(order.lineId)) {
        result.skippedExisting += 1;
        continue;
      }

      const paymentMethodId = paymentMethodIds[order.lineId]?.trim();
      if (!paymentMethodId) {
        result.skippedMissingPayment += 1;
        continue;
      }

      let paymentMethod = paymentMethodCache.get(paymentMethodId);
      if (!paymentMethod) {
        const loaded = await loadPaymentMethodById(supabase, paymentMethodId);
        if (!loaded) {
          result.errors.push(`${order.orderNo}: 결제 방식을 찾을 수 없습니다.`);
          continue;
        }
        paymentMethod = {
          name: loaded.name,
          fee_rate: Number(loaded.fee_rate) || 0,
        };
        paymentMethodCache.set(paymentMethodId, paymentMethod);
      }

      const previewItem = previewByLineId.get(order.lineId);
      const manualProductId =
        manualMatches[order.lineId] ??
        (previewItem?.matchedProductId &&
        !dismissedAutoMatches.has(order.lineId)
          ? previewItem.matchedProductId
          : undefined);

      const resolved = await resolveProductForOrder(supabase, products, order, {
        autoCreateProducts,
        manualProductId,
        skipAutoMatch: dismissedAutoMatches.has(order.lineId),
        createdProductIds,
      });

      if (!resolved) {
        result.skippedUnmatched += 1;
        continue;
      }

      if ("error" in resolved) {
        result.errors.push(`${order.orderNo}: ${resolved.error}`);
        continue;
      }

      const matched = resolved.product;
      if (resolved.created) {
        result.createdProducts += 1;
      }

      const fulfillmentLocation = parseFulfillmentLocation(
        fulfillmentLocations[order.lineId] ?? DEFAULT_FULFILLMENT_LOCATION,
      );
      const fromStore = isStoreFulfillment(fulfillmentLocation);

      const unitPurchasePrice =
        purchasePrices[order.lineId] ??
        (Number(matched.purchase_price) || 0);
      if (unitPurchasePrice < 0) {
        result.errors.push(`${order.orderNo}: 매입가는 0 이상이어야 합니다.`);
        continue;
      }

      const shippingCost = Math.max(
        0,
        Math.round(shippingCosts[order.lineId] ?? 0),
      );
      const { totalAmount, paymentFeeAmount, marginAmount, shippingCost: normalizedShippingCost } =
        buildSaleAmountsForLine(
          order.quantity,
          order.unitSalePrice,
          unitPurchasePrice,
          paymentMethod,
          shippingCost,
        );

      const lineNote = buildImportNote(order, fulfillmentLocation);
      const stockNote = `판매 출고${order.customerName ? ` — ${order.customerName}` : ""}`;

      if (fromStore) {
        const stockResult = await recordStockOutForSale(
          supabase,
          matched.id,
          order.quantity,
          stockNote,
        );

        if ("error" in stockResult) {
          result.errors.push(
            `${order.orderNo}: ${stockResult.error ?? "재고 출고에 실패했습니다."}`,
          );
          continue;
        }
      }

      const insertResult = await insertSaleRecord(supabase, {
        sold_at: order.soldAt,
        product_id: matched.id,
        quantity: order.quantity,
        unit_sale_price: order.unitSalePrice,
        unit_purchase_price: unitPurchasePrice,
        customer_name: order.customerName || null,
        business_partner: null,
        customer_phone: order.customerPhone || null,
        customer_address: order.customerAddress || null,
        payment_method: paymentMethod.name,
        payment_fee_rate: paymentMethod.fee_rate,
        payment_fee_amount: paymentFeeAmount,
        total_amount: totalAmount,
        margin_amount: marginAmount,
        shipping_cost: normalizedShippingCost,
        note: lineNote,
        created_by_user_id: auth.userId,
        created_by_name: auth.name,
        external_source: CAFE24_EXCEL_SOURCE,
        external_order_id: order.lineId,
      });

      if ("error" in insertResult) {
        if (insertResult.error === "DUPLICATE_EXTERNAL_ORDER") {
          result.skippedExisting += 1;
          existingIds.add(order.lineId);
          continue;
        }

        result.errors.push(
          `${order.orderNo}: ${insertResult.error ?? formatSaleInsertError({})}`,
        );
        continue;
      }

      existingIds.add(order.lineId);
      result.imported += 1;
    }

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/products/history");

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "엑셀 매출 등록에 실패했습니다.";
    return { error: message };
  }
}

export async function createProductForCafe24ExcelLink(input: {
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  category?: string;
  brand?: string;
  color?: string;
  product_option?: string;
  size?: string;
}): Promise<{ error: string } | { product: SaleProductOption }> {
  const product_name = input.product_name.trim();
  const model_name = input.model_name.trim();
  const sku = input.sku.trim();
  const supplier = input.supplier.trim() || "카페24";
  const category = input.category?.trim() || null;
  const brand = input.brand?.trim() || null;
  const color = input.color?.trim() || null;
  const product_option = input.product_option?.trim() || null;
  const size = input.size?.trim() || null;

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
    .select(SALE_PRODUCT_OPTION_SELECT)
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
        category: existing.category,
        brand: existing.brand,
        keywords: existing.keywords,
        supplier: existing.supplier,
        sale_price: Number(existing.sale_price) || 0,
        purchase_price: Number(existing.purchase_price) || 0,
        stock_quantity: Number(existing.stock_quantity) || 0,
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
      category,
      brand,
      color,
      product_option,
      size,
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
    .select(SALE_PRODUCT_OPTION_SELECT)
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
      category: data.category,
      brand: data.brand,
      keywords: data.keywords,
      supplier: data.supplier,
      sale_price: Number(data.sale_price) || 0,
      purchase_price: Number(data.purchase_price) || 0,
      stock_quantity: Number(data.stock_quantity) || 0,
    },
  };
}
