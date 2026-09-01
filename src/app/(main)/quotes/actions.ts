"use server";

import { calculateQuoteLine, calculateQuoteTotals } from "@/lib/quote-calculator";
import {
  parseFulfillmentLocation,
  isStoreFulfillment,
} from "@/lib/quote-fulfillment";
import {
  buildSaleAmountsForLine,
  deleteSaleRecord,
  getProductForSale,
  insertSaleRecord,
  recordStockIn,
  recordStockInToLocation,
  recordStockOutForSale,
} from "@/lib/sale-recording";
import {
  normalizeStockLocation,
  type StockLocation,
} from "@/lib/stock-locations";
import {
  AMOUNT_ROUNDING_MODE_OPTIONS,
  AMOUNT_ROUNDING_UNIT_OPTIONS,
  adjustUnitSalePriceForLineDelta,
  resolveQuoteConvertPricing,
  type AmountRoundingMode,
  type AmountRoundingUnit,
  type CardFeePercent,
} from "@/lib/quote-card-pricing";
import { getModifierInfo, requirePermission } from "@/lib/profile";
import { createInlineProduct } from "@/lib/inline-product-create";
import { toQuoteProductOption } from "@/lib/inline-product-create-shared";
import {
  createRegistrationSkuContext,
  DUPLICATE_SKU_MESSAGE,
  resolveRegistrationSku,
} from "@/lib/product-duplicate";
import {
  findQuoteProductByQuery,
  searchQuoteProducts,
} from "@/lib/quote-product-search";
import { createClient } from "@/lib/supabase/server";
import type { QuoteProductOption } from "@/types/quote";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatSaleCategoryDbError } from "@/lib/sale-categories";
import { resolveSaleCategory } from "@/lib/sale-category-options";
import type { QuoteItemInput } from "@/types/quote";
import { QUOTE_MAX_ITEMS } from "@/types/quote";
import type { CopiedQuotePayload } from "@/lib/quote-clipboard";
import { resolvePartnerForSave } from "@/lib/business-partners";
import {
  applyQuoteReservations,
  getReservableQuoteItems,
  releaseQuoteReservations,
} from "@/lib/quote-reservations";

function parseQuoteItems(raw: string): QuoteItemInput[] | { error: string } {
  try {
    const items = JSON.parse(raw) as QuoteItemInput[];
    if (!Array.isArray(items) || items.length === 0) {
      return { error: "견적 제품을 1개 이상 추가해 주세요." };
    }
    if (items.length > QUOTE_MAX_ITEMS) {
      return { error: `견적 제품은 최대 ${QUOTE_MAX_ITEMS}개까지 가능합니다.` };
    }

    for (const item of items) {
      if (!item.model_name || !item.product_name) {
        return { error: "제품 정보가 올바르지 않습니다." };
      }
      if (!item.quantity || item.quantity <= 0) {
        return { error: "수량은 1 이상이어야 합니다." };
      }
    }

    return items.map((item) => {
      const calculated = calculateQuoteLine({
        quantity: item.quantity,
        consumerPrice: item.consumer_price,
        saleUnitPrice: item.sale_unit_price,
        purchasePrice: item.purchase_price,
        shippingCost: item.shipping_cost,
      });

      return {
        ...item,
        purchase_source: item.purchase_source ?? "",
        fulfillment_location: parseFulfillmentLocation(item.fulfillment_location),
        rounded_unit_price: calculated.roundedUnitPrice,
        line_total: calculated.lineTotal,
        margin: calculated.margin,
        margin_rate: calculated.marginRate,
      };
    });
  } catch {
    return { error: "제품 정보 형식이 올바르지 않습니다." };
  }
}

function mapItemsForInsert(quoteId: string, items: QuoteItemInput[]) {
  return items.map((item) => ({
    quote_id: quoteId,
    product_id: item.product_id || null,
    supplier: item.supplier || null,
    purchase_source: item.purchase_source || null,
    fulfillment_location: parseFulfillmentLocation(item.fulfillment_location),
    category: item.category || null,
    brand: item.brand || null,
    product_name: item.product_name,
    model_name: item.model_name,
    color: item.color || null,
    product_option: item.product_option || null,
    size: item.size || null,
    quantity: item.quantity,
    consumer_price: item.consumer_price,
    sale_unit_price: item.sale_unit_price,
    rounded_unit_price: item.rounded_unit_price,
    line_total: item.line_total,
    purchase_price: item.purchase_price,
    shipping_cost: item.shipping_cost,
  }));
}

async function resolvePaymentMethod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentMethodId: string,
) {
  if (!paymentMethodId) {
    return { error: "결제 방식을 선택해 주세요." as const };
  }

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("id, name, fee_rate")
    .eq("id", paymentMethodId)
    .single();

  if (!paymentMethod) {
    return { error: "결제 방식을 찾을 수 없습니다." as const };
  }

  return { paymentMethod };
}

function formatQuoteSaveError(error: {
  message?: string;
  code?: string;
  details?: string;
}) {
  const message = error.message ?? "";

  if (message.includes("fulfillment_location")) {
    return "quote_items 테이블에 출고지(fulfillment_location) 컬럼이 없습니다. Supabase SQL Editor에서 supabase/schema-quote-items-fulfillment.sql을 실행해 주세요.";
  }

  if (
    message.includes("quote_items") &&
    (error.code === "42501" || message.includes("row-level security"))
  ) {
    return "quote_items 삭제/수정 권한이 없습니다. Supabase SQL Editor에서 supabase/schema-quote-items-rls.sql을 실행해 주세요.";
  }

  if (message.includes("business_partner")) {
    return "quotes 테이블에 거래처명(business_partner) 컬럼이 없습니다. Supabase SQL Editor에서 supabase/schema-quotes-business-partner.sql (또는 schema-quotes-update.sql)을 실행해 주세요.";
  }

  if (message.includes("partner_id")) {
    return "quotes 테이블에 partner_id 컬럼이 없습니다. Supabase SQL Editor에서 supabase/schema-business-partners.sql을 실행해 주세요.";
  }

  if (message.includes("sale_category")) {
    return (
      formatSaleCategoryDbError(message, "quotes") ??
      "quotes 테이블에 구분(sale_category) 컬럼이 없습니다. Supabase SQL Editor에서 supabase/schema-quotes-sale-category.sql을 실행해 주세요."
    );
  }

  if (
    message.includes("manager_name") ||
    message.includes("memo") ||
    message.includes("payment_method_id")
  ) {
    return "quotes 테이블 업데이트가 필요합니다. Supabase SQL Editor에서 supabase/schema-quotes-update.sql을 실행해 주세요.";
  }

  if (message.includes("created_by_name") || message.includes("created_by_user_id")) {
    return "quotes 테이블에 작성자 컬럼이 없습니다. supabase/schema-quotes.sql을 다시 확인해 주세요.";
  }

  if (error.code === "42501" || message.includes("row-level security")) {
    return "견적 등록 권한이 없습니다. supabase/schema-quotes.sql의 insert policy를 확인해 주세요.";
  }

  if (message) {
    return `견적 저장에 실패했습니다: ${message}`;
  }

  return "견적 저장에 실패했습니다. supabase/schema-quotes.sql 및 schema-quotes-update.sql을 실행했는지 확인해 주세요.";
}

function readQuoteFormFields(formData: FormData) {
  return {
    quote_date: String(formData.get("quote_date") ?? "").trim(),
    sale_category: String(formData.get("sale_category") ?? "").trim(),
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    business_partner: String(formData.get("business_partner") ?? "").trim(),
    partner_id: String(formData.get("partner_id") ?? "").trim(),
    customer_phone: String(formData.get("customer_phone") ?? "").trim(),
    customer_address: String(formData.get("customer_address") ?? "").trim(),
    customer_email: String(formData.get("customer_email") ?? "").trim(),
    customer_note: String(formData.get("customer_note") ?? "").trim(),
    memo: String(formData.get("memo") ?? "").trim(),
    manager_name: String(formData.get("manager_name") ?? "").trim(),
    payment_method_id: String(formData.get("payment_method_id") ?? "").trim(),
    itemsRaw: String(formData.get("items_json") ?? ""),
  };
}

async function resolveQuotePartner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fields: ReturnType<typeof readQuoteFormFields>,
) {
  return resolvePartnerForSave(supabase, {
    partner_id: fields.partner_id || null,
    business_partner: fields.business_partner || null,
    source: "quote",
    contact_name: fields.customer_name || null,
    contact_phone: fields.customer_phone || null,
    contact_email: fields.customer_email || null,
    contact_address: fields.customer_address || null,
  });
}

export async function createQuote(formData: FormData) {
  const fields = readQuoteFormFields(formData);

  if (!fields.quote_date) return { error: "견적일을 입력해 주세요." };
  if (!fields.customer_name) return { error: "고객명을 입력해 주세요." };

  const parsedItems = parseQuoteItems(fields.itemsRaw);
  if ("error" in parsedItems) return { error: parsedItems.error };

  const { totalAmount, cardAmount } = calculateQuoteTotals(parsedItems);

  const supabase = await createClient();
  const sale_category = await resolveSaleCategory(supabase, fields.sale_category);
  if (!sale_category) return { error: "구분을 선택해 주세요." };

  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };
  const modifier = await getModifierInfo();
  if ("error" in modifier) return { error: modifier.error };

  const paymentResult = await resolvePaymentMethod(
    supabase,
    fields.payment_method_id,
  );
  if ("error" in paymentResult) return { error: paymentResult.error };

  const { paymentMethod } = paymentResult;

  const partnerResult = await resolveQuotePartner(supabase, fields);

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      quote_date: fields.quote_date,
      sale_category,
      customer_name: fields.customer_name,
      business_partner: partnerResult.business_partner,
      partner_id: partnerResult.partner_id,
      customer_phone: fields.customer_phone || null,
      customer_address: fields.customer_address || null,
      customer_email: fields.customer_email || null,
      customer_note: fields.customer_note || null,
      memo: fields.memo || null,
      manager_name: fields.manager_name || modifier.name,
      payment_method_id: paymentMethod.id,
      payment_method: paymentMethod.name,
      total_amount: totalAmount,
      card_amount: cardAmount,
      created_by_user_id: modifier.userId,
      created_by_name: modifier.name,
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    return {
      error: formatQuoteSaveError(quoteError ?? {}),
    };
  }

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(mapItemsForInsert(quote.id, parsedItems));

  if (itemsError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { error: "견적 항목 저장에 실패했습니다." };
  }

  revalidatePath("/quotes");
  redirect("/quotes");
}

function normalizePastedQuoteItems(items: QuoteItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "견적 제품을 1개 이상 추가해 주세요." as const };
  }
  if (items.length > QUOTE_MAX_ITEMS) {
    return {
      error: `견적 제품은 최대 ${QUOTE_MAX_ITEMS}개까지 가능합니다.` as const,
    };
  }

  const parsedItems = items.map((item) => {
    const calculated = calculateQuoteLine({
      quantity: item.quantity,
      consumerPrice: item.consumer_price,
      saleUnitPrice: item.sale_unit_price,
      purchasePrice: item.purchase_price,
      shippingCost: item.shipping_cost,
    });

    return {
      ...item,
      purchase_source: item.purchase_source ?? "",
      fulfillment_location: parseFulfillmentLocation(item.fulfillment_location),
      rounded_unit_price: calculated.roundedUnitPrice,
      line_total: calculated.lineTotal,
      margin: calculated.margin,
      margin_rate: calculated.marginRate,
    };
  });

  return { items: parsedItems };
}

export async function pasteQuote(payload: CopiedQuotePayload) {
  const customer_name = payload.customer_name?.trim();
  if (!customer_name) return { error: "고객명이 없습니다." };

  const parsed = normalizePastedQuoteItems(payload.items);
  if ("error" in parsed) return { error: parsed.error };

  const { totalAmount, cardAmount } = calculateQuoteTotals(parsed.items);
  const quote_date = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const sale_category = await resolveSaleCategory(
    supabase,
    payload.sale_category ?? "",
  );
  if (!sale_category) return { error: "구분을 선택해 주세요." };

  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };
  const modifier = await getModifierInfo();
  if ("error" in modifier) return { error: modifier.error };

  const payment_method_id = payload.payment_method_id?.trim() ?? "";
  const paymentResult = await resolvePaymentMethod(supabase, payment_method_id);
  if ("error" in paymentResult) return { error: paymentResult.error };

  const { paymentMethod } = paymentResult;

  const partnerResult = await resolvePartnerForSave(supabase, {
    partner_id: null,
    business_partner: payload.business_partner?.trim() || null,
    source: "quote",
    contact_name: customer_name || null,
    contact_phone: payload.customer_phone?.trim() || null,
    contact_email: payload.customer_email?.trim() || null,
    contact_address: payload.customer_address?.trim() || null,
  });

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      quote_date,
      sale_category,
      customer_name,
      business_partner: partnerResult.business_partner,
      partner_id: partnerResult.partner_id,
      customer_phone: payload.customer_phone?.trim() || null,
      customer_address: payload.customer_address?.trim() || null,
      customer_email: payload.customer_email?.trim() || null,
      customer_note: payload.customer_note?.trim() || null,
      memo: payload.memo?.trim() || null,
      manager_name: payload.manager_name?.trim() || modifier.name,
      payment_method_id: paymentMethod.id,
      payment_method: paymentMethod.name,
      total_amount: totalAmount,
      card_amount: cardAmount,
      created_by_user_id: modifier.userId,
      created_by_name: modifier.name,
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    return {
      error: formatQuoteSaveError(quoteError ?? {}),
    };
  }

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(mapItemsForInsert(quote.id, parsed.items));

  if (itemsError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { error: "견적 항목 저장에 실패했습니다." };
  }

  revalidatePath("/quotes");
  return { success: true as const, quoteId: quote.id as string };
}

export async function updateQuote(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const fields = readQuoteFormFields(formData);

  if (!fields.quote_date) return { error: "견적일을 입력해 주세요." };
  if (!fields.customer_name) return { error: "고객명을 입력해 주세요." };

  const parsedItems = parseQuoteItems(fields.itemsRaw);
  if ("error" in parsedItems) return { error: parsedItems.error };

  const { totalAmount, cardAmount } = calculateQuoteTotals(parsedItems);

  const supabase = await createClient();
  const sale_category = await resolveSaleCategory(supabase, fields.sale_category);
  if (!sale_category) return { error: "구분을 선택해 주세요." };

  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };
  const modifier = await getModifierInfo();
  if ("error" in modifier) return { error: modifier.error };

  const paymentResult = await resolvePaymentMethod(
    supabase,
    fields.payment_method_id,
  );
  if ("error" in paymentResult) return { error: paymentResult.error };

  const { paymentMethod } = paymentResult;

  const partnerResult = await resolveQuotePartner(supabase, fields);

  const { error: quoteError } = await supabase
    .from("quotes")
    .update({
      quote_date: fields.quote_date,
      sale_category,
      customer_name: fields.customer_name,
      business_partner: partnerResult.business_partner,
      partner_id: partnerResult.partner_id,
      customer_phone: fields.customer_phone || null,
      customer_address: fields.customer_address || null,
      customer_email: fields.customer_email || null,
      customer_note: fields.customer_note || null,
      memo: fields.memo || null,
      manager_name: fields.manager_name || modifier.name,
      payment_method_id: paymentMethod.id,
      payment_method: paymentMethod.name,
      total_amount: totalAmount,
      card_amount: cardAmount,
    })
    .eq("id", quoteId);

  if (quoteError) {
    return { error: formatQuoteSaveError(quoteError) };
  }

  const { error: deleteItemsError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteItemsError) {
    return {
      error: formatQuoteSaveError(deleteItemsError),
    };
  }

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(mapItemsForInsert(quoteId, parsedItems));

  if (itemsError) {
    return { error: "견적 항목 수정에 실패했습니다." };
  }

  const { data: updatedQuote } = await supabase
    .from("quotes")
    .select("is_reserved, quote_items(*)")
    .eq("id", quoteId)
    .single();

  if (updatedQuote?.is_reserved) {
    const reservationResult = await applyQuoteReservations(
      supabase,
      quoteId,
      updatedQuote.quote_items ?? [],
    );
    if ("error" in reservationResult && reservationResult.error) {
      return { error: reservationResult.error };
    }
    revalidatePath("/products");
    revalidatePath("/products/stock/list");
  }

  revalidatePath("/quotes");
  return { success: true };
}

export async function convertQuoteToSale(
  quoteId: string,
  options?: {
    sellerUserId?: string;
    sellerName?: string;
    cardFeePercent?: CardFeePercent;
    actualFeeRate?: number;
    roundingUnit?: AmountRoundingUnit;
    roundingMode?: AmountRoundingMode;
    purchaseQuantities?: Record<string, number>;
  },
) {
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const supabase = await createClient();
  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };
  const modifier = await getModifierInfo();
  if ("error" in modifier) return { error: modifier.error };

  const sellerUserId = options?.sellerUserId?.trim() || modifier.userId;
  const sellerName = options?.sellerName?.trim() || modifier.name;

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*, quote_items(*, products(color, product_option, size))")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return { error: "견적을 찾을 수 없습니다." };
  }

  if (!quote.quote_items?.length) {
    return { error: "견적 제품이 없습니다." };
  }

  const { data: existingSales, error: existingSalesError } = await supabase
    .from("sales")
    .select("id")
    .eq("quote_id", quoteId)
    .limit(1);

  if (existingSalesError) {
    if (existingSalesError.message?.includes("quote_id")) {
      return {
        error:
          "sales 테이블에 quote_id 컬럼이 없습니다. supabase/schema-quotes-conversion.sql을 실행해 주세요.",
      };
    }
    return { error: "매출전환 상태를 확인하지 못했습니다." };
  }

  if (existingSales?.length) {
    return { error: "이미 매출전환된 견적입니다." };
  }

  if (!quote.payment_method_id) {
    return { error: "결제 방식이 설정되지 않은 견적입니다. 견적을 수정해 주세요." };
  }

  const releaseResult = await releaseQuoteReservations(supabase, quoteId, {
    keepIntent: true,
  });
  if ("error" in releaseResult && releaseResult.error) {
    return { error: releaseResult.error };
  }

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("name, fee_rate")
    .eq("id", quote.payment_method_id)
    .single();

  if (!paymentMethod) {
    return { error: "결제 방식을 찾을 수 없습니다." };
  }

  const soldAt = new Date().toISOString().slice(0, 10);
  const stockNote = `견적 매출전환${quote.customer_name ? ` — ${quote.customer_name}` : ""}`;
  const quoteItems = quote.quote_items ?? [];
  const cardFeePercent = options?.cardFeePercent ?? 0;
  const roundingUnit = options?.roundingUnit ?? "none";
  const roundingMode = options?.roundingMode ?? "none";
  const actualFeeRate =
    options?.actualFeeRate !== undefined
      ? Math.min(10, Math.max(0, Math.round(options.actualFeeRate * 10) / 10))
      : Number(paymentMethod.fee_rate) || 0;
  const quoteTotal = Math.round(Number(quote.total_amount) || 0);
  const { cardPaymentTotal, delta: pricingDelta } = resolveQuoteConvertPricing(
    quoteTotal,
    cardFeePercent,
    roundingUnit,
    roundingMode,
  );
  const cardPricingNote =
    cardFeePercent > 0 || actualFeeRate > 0
      ? (() => {
          const unitLabel =
            AMOUNT_ROUNDING_UNIT_OPTIONS.find(
              (option) => option.value === roundingUnit,
            )?.label ?? "없음";
          const modeLabel =
            AMOUNT_ROUNDING_MODE_OPTIONS.find(
              (option) => option.value === roundingMode,
            )?.label ?? "없음";
          const parts = [
            cardFeePercent > 0
              ? `실결제 ${cardPaymentTotal.toLocaleString("ko-KR")}원 (고객청구 +${cardFeePercent}% · ${unitLabel} ${modeLabel})`
              : null,
            actualFeeRate > 0
              ? `실제 PG ${actualFeeRate % 1 === 0 ? actualFeeRate : actualFeeRate.toFixed(1)}%`
              : null,
          ].filter(Boolean);
          return parts.join(" / ");
        })()
      : null;
  const saleNote =
    [quote.memo, quote.customer_note, cardPricingNote].filter(Boolean).join("\n") ||
    null;

  const completed: {
    saleId: string;
    productId: string;
    stockOutQuantity: number;
    stockInQuantity: number;
  }[] = [];

  async function rollbackCompleted() {
    for (const done of completed.reverse()) {
      await deleteSaleRecord(supabase, done.saleId);
      if (done.stockOutQuantity > 0) {
        await recordStockIn(
          supabase,
          done.productId,
          done.stockOutQuantity,
          `${stockNote} (매출전환 롤백)`,
        );
      }
      if (done.stockInQuantity > 0) {
        await recordStockOutForSale(
          supabase,
          done.productId,
          done.stockInQuantity,
          `${stockNote} (매입 입고 롤백)`,
        );
      }
    }
  }

  for (let index = 0; index < quoteItems.length; index += 1) {
    const item = quoteItems[index];
    const lineNumber = index + 1;
    const isLastLine = index === quoteItems.length - 1;

    if (!item.product_id) {
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): 제품 연결이 없습니다.`,
      };
    }

    const quantity = Math.round(Number(item.quantity) || 0);
    const baseUnitSalePrice = Math.round(Number(item.sale_unit_price) || 0);
    const unit_sale_price =
      isLastLine && pricingDelta !== 0
        ? adjustUnitSalePriceForLineDelta({
            quantity,
            unitSalePrice: baseUnitSalePrice,
            delta: pricingDelta,
          })
        : baseUnitSalePrice;
    const unit_purchase_price = Math.round(Number(item.purchase_price) || 0);
    const fromStore = isStoreFulfillment(item.fulfillment_location);
    const purchaseInQuantity = Math.max(
      0,
      Math.round(Number(options?.purchaseQuantities?.[item.id]) || 0),
    );

    if (quantity <= 0) {
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): 수량이 올바르지 않습니다.`,
      };
    }

    const productResult = await getProductForSale(supabase, item.product_id);
    if ("error" in productResult) {
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): ${productResult.error}`,
      };
    }

    const shipping_cost = Math.max(0, Math.round(Number(item.shipping_cost) || 0));
    const { totalAmount, paymentFeeAmount, marginAmount } =
      buildSaleAmountsForLine(
        quantity,
        unit_sale_price,
        unit_purchase_price,
        paymentMethod,
        shipping_cost,
        actualFeeRate,
      );

    const purchaseSourceNote = item.purchase_source?.trim()
      ? `매입처: ${item.purchase_source.trim()}`
      : null;
    const fulfillmentNote = fromStore ? null : "출고: 직발송";
    const lineNote = [purchaseSourceNote, fulfillmentNote].filter(Boolean).join(" / ");

    const saleResult = await insertSaleRecord(supabase, {
      sold_at: soldAt,
      sale_category: quote.sale_category,
      product_id: item.product_id,
      quantity,
      unit_sale_price,
      unit_purchase_price,
      customer_name: quote.customer_name || null,
      business_partner: quote.business_partner || null,
      partner_id: quote.partner_id || null,
      customer_phone: quote.customer_phone || null,
      customer_address: quote.customer_address || null,
      payment_method: paymentMethod.name,
      payment_fee_rate: actualFeeRate,
      payment_fee_amount: paymentFeeAmount,
      total_amount: totalAmount,
      margin_amount: marginAmount,
      shipping_cost,
      note: [saleNote, lineNote].filter(Boolean).join("\n") || null,
      created_by_user_id: sellerUserId,
      created_by_name: sellerName,
      quote_id: quoteId,
    });

    if ("error" in saleResult) {
      await rollbackCompleted();
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}) 매출 기록 실패: ${saleResult.error}`,
      };
    }

    const stockLocation = normalizeStockLocation(
      productResult.product.stock_location,
    ) as StockLocation;

    if (purchaseInQuantity > 0) {
      const stockInResult = await recordStockInToLocation(
        supabase,
        item.product_id,
        purchaseInQuantity,
        stockLocation,
        `${stockNote} (매입 입고)`,
      );

      if ("error" in stockInResult) {
        await deleteSaleRecord(supabase, saleResult.saleId);
        await rollbackCompleted();
        return {
          error: `${lineNumber}번째 줄 (${item.model_name}): ${stockInResult.error}`,
        };
      }
    }

    const stockOutQuantity = fromStore ? quantity : 0;

    if (stockOutQuantity > 0) {
      const stockResult = await recordStockOutForSale(
        supabase,
        item.product_id,
        stockOutQuantity,
        stockNote,
      );

      if ("error" in stockResult) {
        if (purchaseInQuantity > 0) {
          await recordStockOutForSale(
            supabase,
            item.product_id,
            purchaseInQuantity,
            `${stockNote} (매입 입고 롤백)`,
          );
        }
        await deleteSaleRecord(supabase, saleResult.saleId);
        await rollbackCompleted();
        return {
          error: `${lineNumber}번째 줄 (${item.model_name}): ${stockResult.error}`,
        };
      }
    }

    completed.push({
      saleId: saleResult.saleId,
      productId: item.product_id,
      stockOutQuantity,
      stockInQuantity: purchaseInQuantity,
    });
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/products/stock/list");
  revalidatePath("/dashboard");
  revalidatePath("/quotes");

  return { success: true };
}

export async function cancelQuoteConversion(quoteId: string) {
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const supabase = await createClient();
  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("is_reserved, quote_items(*)")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return { error: "견적을 찾을 수 없습니다." };
  }

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("id, product_id, quantity, customer_name")
    .eq("quote_id", quoteId);

  if (salesError) {
    if (salesError.message?.includes("quote_id")) {
      return {
        error:
          "sales 테이블에 quote_id 컬럼이 없습니다. supabase/schema-quotes-conversion.sql을 실행해 주세요.",
      };
    }
    return { error: "매출 기록을 찾지 못했습니다." };
  }

  if (!sales?.length) {
    return { error: "매출전환된 기록이 없습니다." };
  }

  for (const sale of sales) {
    const stockNote = `견적 매출전환${sale.customer_name ? ` — ${sale.customer_name}` : ""}`;
    const { data: stockOutMovement } = await supabase
      .from("stock_movements")
      .select("quantity")
      .eq("product_id", sale.product_id)
      .eq("movement_type", "out")
      .eq("note", stockNote)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stockOutMovement?.quantity) {
      const stockResult = await recordStockIn(
        supabase,
        sale.product_id,
        stockOutMovement.quantity,
        `견적 매출취소${sale.customer_name ? ` — ${sale.customer_name}` : ""}`,
      );

      if ("error" in stockResult) {
        return { error: stockResult.error };
      }
    }

    await deleteSaleRecord(supabase, sale.id);
  }

  if (quote.is_reserved) {
    const reservationResult = await applyQuoteReservations(
      supabase,
      quoteId,
      quote.quote_items ?? [],
    );
    if ("error" in reservationResult && reservationResult.error) {
      return { error: reservationResult.error };
    }
    revalidatePath("/products/stock/list");
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");
  revalidatePath("/quotes");

  return { success: true };
}

export async function reserveQuote(quoteId: string) {
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const supabase = await createClient();
  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };

  const { data: existingSales } = await supabase
    .from("sales")
    .select("id")
    .eq("quote_id", quoteId)
    .limit(1);

  if (existingSales?.length) {
    return { error: "이미 매출전환된 견적은 예약할 수 없습니다." };
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return { error: "견적을 찾을 수 없습니다." };
  }

  const reservableItems = getReservableQuoteItems(quote.quote_items ?? []);
  if (reservableItems.length === 0) {
    return { error: "예약할 매장 출고 품목이 없습니다." };
  }

  for (const item of reservableItems) {
    if (!item.product_id) {
      return {
        error: `${item.model_name}: 제품 연결이 없어 예약할 수 없습니다.`,
      };
    }
  }

  const result = await applyQuoteReservations(
    supabase,
    quoteId,
    quote.quote_items ?? [],
  );
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/quotes");
  revalidatePath("/products");
  revalidatePath("/products/stock/list");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  return { success: true as const };
}

export async function releaseQuote(quoteId: string) {
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const supabase = await createClient();
  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return { error: auth.error };

  const result = await releaseQuoteReservations(supabase, quoteId);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/quotes");
  revalidatePath("/products");
  revalidatePath("/products/stock/list");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");

  return { success: true as const };
}

export async function searchQuoteProductsForAutocomplete(
  query: string,
): Promise<{ products: QuoteProductOption[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { products: [], error: "로그인이 필요합니다." };
  }

  const products = await searchQuoteProducts(supabase, query);
  return { products, error: null };
}

export async function findQuoteProductForAdd(
  query: string,
): Promise<{ product: QuoteProductOption | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { product: null, error: "로그인이 필요합니다." };
  }

  const product = await findQuoteProductByQuery(supabase, query);
  return { product, error: null };
}

export async function createProductForQuoteLink(input: {
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity?: number;
  category?: string;
  brand?: string;
  color?: string;
  product_option?: string;
  size?: string;
}): Promise<{ error: string } | { product: QuoteProductOption }> {
  const result = await createInlineProduct(input);

  if ("error" in result) {
    return result;
  }

  revalidatePath("/products");

  return { product: toQuoteProductOption(result.product) };
}

export async function deleteQuote(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return;

  const supabase = await createClient();
  const auth = await requirePermission("manageQuotes");
  if ("error" in auth) return;

  const releaseResult = await releaseQuoteReservations(supabase, quoteId);
  if ("error" in releaseResult && releaseResult.error) {
    console.error("deleteQuote release error:", releaseResult.error);
    return;
  }

  await supabase.from("quotes").delete().eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath("/products");
  revalidatePath("/products/stock/list");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");
}
