"use server";

import { calculateQuoteLine, calculateQuoteTotals } from "@/lib/quote-calculator";
import {
  buildSaleAmountsForLine,
  deleteSaleRecord,
  insertSaleRecord,
  recordStockIn,
  recordStockOutForSale,
  validateProductStock,
} from "@/lib/sale-recording";
import { getModifierInfo } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { QuoteItemInput } from "@/types/quote";
import { QUOTE_MAX_ITEMS } from "@/types/quote";

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
    category: item.category || null,
    brand: item.brand || null,
    product_name: item.product_name,
    model_name: item.model_name,
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

function readQuoteFormFields(formData: FormData) {
  return {
    quote_date: String(formData.get("quote_date") ?? "").trim(),
    customer_name: String(formData.get("customer_name") ?? "").trim(),
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

export async function createQuote(formData: FormData) {
  const fields = readQuoteFormFields(formData);

  if (!fields.quote_date) return { error: "견적일을 입력해 주세요." };
  if (!fields.customer_name) return { error: "고객 성함을 입력해 주세요." };

  const parsedItems = parseQuoteItems(fields.itemsRaw);
  if ("error" in parsedItems) return { error: parsedItems.error };

  const { totalAmount, cardAmount } = calculateQuoteTotals(parsedItems);

  const supabase = await createClient();
  const modifier = await getModifierInfo(supabase);
  if ("error" in modifier) return { error: modifier.error };

  const paymentResult = await resolvePaymentMethod(
    supabase,
    fields.payment_method_id,
  );
  if ("error" in paymentResult) return { error: paymentResult.error };

  const { paymentMethod } = paymentResult;

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      quote_date: fields.quote_date,
      customer_name: fields.customer_name,
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
      error:
        "견적 저장에 실패했습니다. supabase/schema-quotes.sql을 실행했는지 확인해 주세요.",
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

export async function updateQuote(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const fields = readQuoteFormFields(formData);

  if (!fields.quote_date) return { error: "견적일을 입력해 주세요." };
  if (!fields.customer_name) return { error: "고객 성함을 입력해 주세요." };

  const parsedItems = parseQuoteItems(fields.itemsRaw);
  if ("error" in parsedItems) return { error: parsedItems.error };

  const { totalAmount, cardAmount } = calculateQuoteTotals(parsedItems);

  const supabase = await createClient();
  const modifier = await getModifierInfo(supabase);
  if ("error" in modifier) return { error: modifier.error };

  const paymentResult = await resolvePaymentMethod(
    supabase,
    fields.payment_method_id,
  );
  if ("error" in paymentResult) return { error: paymentResult.error };

  const { paymentMethod } = paymentResult;

  const { error: quoteError } = await supabase
    .from("quotes")
    .update({
      quote_date: fields.quote_date,
      customer_name: fields.customer_name,
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
    return { error: "견적 수정에 실패했습니다." };
  }

  await supabase.from("quote_items").delete().eq("quote_id", quoteId);

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(mapItemsForInsert(quoteId, parsedItems));

  if (itemsError) {
    return { error: "견적 항목 수정에 실패했습니다." };
  }

  revalidatePath("/quotes");
  return { success: true };
}

export async function convertQuoteToSale(quoteId: string) {
  if (!quoteId) return { error: "견적 ID가 없습니다." };

  const supabase = await createClient();
  const modifier = await getModifierInfo(supabase);
  if ("error" in modifier) return { error: modifier.error };

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return { error: "견적을 찾을 수 없습니다." };
  }

  if (!quote.quote_items?.length) {
    return { error: "견적 제품이 없습니다." };
  }

  if (!quote.payment_method_id) {
    return { error: "결제 방식이 설정되지 않은 견적입니다. 견적을 수정해 주세요." };
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
  const saleNote =
    [quote.memo, quote.customer_note].filter(Boolean).join("\n") || null;

  const completed: {
    saleId: string;
    productId: string;
    quantity: number;
  }[] = [];

  for (let index = 0; index < quote.quote_items.length; index += 1) {
    const item = quote.quote_items[index];
    const lineNumber = index + 1;

    if (!item.product_id) {
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): 제품 연결이 없습니다.`,
      };
    }

    const quantity = Math.round(Number(item.quantity) || 0);
    const unit_sale_price = Math.round(Number(item.sale_unit_price) || 0);

    if (quantity <= 0) {
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): 수량이 올바르지 않습니다.`,
      };
    }

    const stockCheck = await validateProductStock(
      supabase,
      item.product_id,
      quantity,
    );
    if ("error" in stockCheck) {
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): ${stockCheck.error}`,
      };
    }

    const { totalAmount, paymentFeeAmount, marginAmount } =
      buildSaleAmountsForLine(
        quantity,
        unit_sale_price,
        stockCheck.product.purchase_price,
        paymentMethod,
      );

    const saleResult = await insertSaleRecord(supabase, {
      sold_at: soldAt,
      product_id: item.product_id,
      quantity,
      unit_sale_price,
      unit_purchase_price: stockCheck.product.purchase_price,
      customer_name: quote.customer_name || null,
      customer_phone: quote.customer_phone || null,
      customer_address: quote.customer_address || null,
      payment_method: paymentMethod.name,
      payment_fee_rate: Number(paymentMethod.fee_rate) || 0,
      payment_fee_amount: paymentFeeAmount,
      total_amount: totalAmount,
      margin_amount: marginAmount,
      note: saleNote,
      created_by_user_id: modifier.userId,
      created_by_name: modifier.name,
    });

    if ("error" in saleResult) {
      for (const done of completed.reverse()) {
        await deleteSaleRecord(supabase, done.saleId);
        await recordStockIn(
          supabase,
          done.productId,
          done.quantity,
          `${stockNote} (매출전환 롤백)`,
        );
      }
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}) 매출 기록 실패: ${saleResult.error}`,
      };
    }

    const stockResult = await recordStockOutForSale(
      supabase,
      item.product_id,
      quantity,
      stockNote,
    );

    if ("error" in stockResult) {
      await deleteSaleRecord(supabase, saleResult.saleId);
      for (const done of completed.reverse()) {
        await deleteSaleRecord(supabase, done.saleId);
        await recordStockIn(
          supabase,
          done.productId,
          done.quantity,
          `${stockNote} (매출전환 롤백)`,
        );
      }
      return {
        error: `${lineNumber}번째 줄 (${item.model_name}): ${stockResult.error}`,
      };
    }

    completed.push({
      saleId: saleResult.saleId,
      productId: item.product_id,
      quantity,
    });
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/products/history");
  revalidatePath("/dashboard");
  revalidatePath("/quotes");

  return { success: true };
}

export async function deleteQuote(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return;

  const supabase = await createClient();
  await supabase.from("quotes").delete().eq("id", quoteId);
  revalidatePath("/quotes");
}
