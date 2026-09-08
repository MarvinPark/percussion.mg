import { getModifierInfo } from "@/lib/profile";
import {
  isNonStockServiceItem,
  isStoreFulfillment,
} from "@/lib/quote-fulfillment";
import {
  deductLocationStock,
  restoreLocationStockFromTaken,
  sumLocationStock,
  type LocationStockPatch,
} from "@/lib/stock-locations";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuoteItemForReservation = {
  id: string;
  product_id: string | null;
  quantity: number;
  fulfillment_location?: string | null;
  model_name: string;
  product_name: string;
  category?: string | null;
};

export type QuoteReservationRow = {
  product_id: string;
  quantity: number;
  stock_yangjae: number;
  stock_uiwang: number;
};

export function getReservableQuoteItems(items: QuoteItemForReservation[]) {
  return items.filter(
    (item) =>
      item.product_id &&
      isStoreFulfillment(item.fulfillment_location) &&
      !isNonStockServiceItem(item) &&
      Math.round(Number(item.quantity) || 0) > 0,
  );
}

export async function syncProductReservedQuantity(
  supabase: SupabaseClient,
  productId: string,
) {
  const { data, error } = await supabase
    .from("quote_reservations")
    .select("quantity")
    .eq("product_id", productId);

  if (error) {
    return { error: error.message };
  }

  const reserved_quantity =
    data?.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0) ?? 0;

  const { error: updateError } = await supabase
    .from("products")
    .update({ reserved_quantity })
    .eq("id", productId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { reserved_quantity };
}

async function syncProductsReservedQuantities(
  supabase: SupabaseClient,
  productIds: string[],
) {
  for (const productId of productIds) {
    const result = await syncProductReservedQuantity(supabase, productId);
    if ("error" in result && result.error) {
      return { error: result.error };
    }
  }

  return { success: true as const };
}

async function fetchProductForReservation(
  supabase: SupabaseClient,
  productId: string,
) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, product_name, stock_quantity, stock_yangjae, stock_uiwang, stock_location",
    )
    .eq("id", productId)
    .single();

  if (error || !data) {
    return { error: "제품 재고를 불러오지 못했습니다." as const };
  }

  return { product: data };
}

async function applyPhysicalReservationRestore(
  supabase: SupabaseClient,
  productId: string,
  taken: LocationStockPatch,
  note: string,
) {
  if (
    taken.stock_yangjae + taken.stock_uiwang <= 0
  ) {
    return { success: true as const };
  }

  const productResult = await fetchProductForReservation(supabase, productId);
  if ("error" in productResult) return productResult;

  const { product } = productResult;
  const stockBefore = Number(product.stock_quantity) || 0;
  const locationPatch = restoreLocationStockFromTaken(product, taken);
  const stockAfter = sumLocationStock({ ...product, ...locationPatch });

  const modifier = await getModifierInfo();
  if ("error" in modifier) return modifier;

  const { error: movementError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    movement_type: "in",
    quantity: taken.stock_yangjae + taken.stock_uiwang,
    stock_before: stockBefore,
    stock_after: stockAfter,
    note,
    modified_by_user_id: modifier.userId,
    modified_by_name: modifier.name,
  });

  if (movementError) {
    return { error: "예약 해제 재고 기록에 실패했습니다." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      ...locationPatch,
      stock_quantity: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return { error: "재고 복원에 실패했습니다." };
  }

  return { success: true as const };
}

async function applyPhysicalReservationDeduct(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  note: string,
) {
  const productResult = await fetchProductForReservation(supabase, productId);
  if ("error" in productResult) return productResult;

  const { product } = productResult;
  const deductResult = deductLocationStock(product, quantity, true);
  if (!deductResult) {
    return { error: "재고 차감에 실패했습니다." };
  }

  const { next, taken } = deductResult;
  const stockBefore = Number(product.stock_quantity) || 0;
  const stockAfter = sumLocationStock({ ...product, ...next });

  const modifier = await getModifierInfo();
  if ("error" in modifier) return modifier;

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
    return { error: "예약 재고 기록에 실패했습니다." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      ...next,
      stock_quantity: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return { error: "재고 차감에 실패했습니다." };
  }

  return { taken, success: true as const };
}

async function restoreQuoteReservationRows(
  supabase: SupabaseClient,
  quoteId: string,
  notePrefix: string,
) {
  const { data: reservations, error: fetchError } = await supabase
    .from("quote_reservations")
    .select(
      "product_id, quantity, stock_yangjae, stock_uiwang, quotes(customer_name)",
    )
    .eq("quote_id", quoteId);

  if (fetchError) {
    if (fetchError.message.includes("quote_reservations")) {
      return {
        error:
          "quote_reservations 테이블이 없습니다. supabase/schema-quote-reservations.sql을 실행해 주세요.",
      };
    }
    return { error: fetchError.message };
  }

  const productIds = [
    ...new Set(
      (reservations ?? [])
        .map((row) => row.product_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  for (const row of reservations ?? []) {
    const taken: LocationStockPatch = {
      stock_yangjae: Number(row.stock_yangjae) || 0,
      stock_uiwang: Number(row.stock_uiwang) || 0,
    };

    const quantity = Number(row.quantity) || 0;
    if (quantity <= 0) continue;

    const quote = row.quotes as
      | { customer_name?: string | null }
      | Array<{ customer_name?: string | null }>
      | null;
    const quoteRow = Array.isArray(quote) ? quote[0] : quote;
    const customerName = quoteRow?.customer_name?.trim();
    const note = customerName
      ? `${notePrefix} — ${customerName}`
      : notePrefix;

    // 위치별 차감 기록이 없으면 되돌릴 대상도 없습니다. 수량을 특정 위치에
    // 추측해서 더하면 차감된 적 없는 재고가 생기므로 그대로 넘깁니다.
    // (applyPhysicalReservationRestore가 taken 합계 0을 건너뜁니다.)
    const restoreResult = await applyPhysicalReservationRestore(
      supabase,
      row.product_id,
      taken,
      note,
    );
    if ("error" in restoreResult && restoreResult.error) {
      return restoreResult;
    }
  }

  const { error: deleteError } = await supabase
    .from("quote_reservations")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  return syncProductsReservedQuantities(supabase, productIds);
}

export async function releaseQuoteReservations(
  supabase: SupabaseClient,
  quoteId: string,
  options?: { keepIntent?: boolean },
) {
  const syncResult = await restoreQuoteReservationRows(
    supabase,
    quoteId,
    "견적 예약 해제",
  );
  if ("error" in syncResult && syncResult.error) {
    return syncResult;
  }

  if (!options?.keepIntent) {
    const { error: quoteUpdateError } = await supabase
      .from("quotes")
      .update({ is_reserved: false })
      .eq("id", quoteId);

    if (quoteUpdateError && !quoteUpdateError.message.includes("is_reserved")) {
      return { error: quoteUpdateError.message };
    }
  }

  return syncResult;
}

export async function applyQuoteReservations(
  supabase: SupabaseClient,
  quoteId: string,
  items: QuoteItemForReservation[],
) {
  const reservableItems = getReservableQuoteItems(items);

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("customer_name")
    .eq("id", quoteId)
    .single();

  if (quoteError) {
    return { error: quoteError.message };
  }

  const customerLabel = quote.customer_name?.trim() || "견적";
  const reserveNote = `견적 예약 — ${customerLabel}`;

  const restoreResult = await restoreQuoteReservationRows(
    supabase,
    quoteId,
    "견적 예약 변경(복원)",
  );
  if ("error" in restoreResult && restoreResult.error) {
    return restoreResult;
  }

  if (reservableItems.length === 0) {
    const { error: quoteUpdateError } = await supabase
      .from("quotes")
      .update({ is_reserved: false })
      .eq("id", quoteId);

    if (quoteUpdateError && !quoteUpdateError.message.includes("is_reserved")) {
      return { error: quoteUpdateError.message };
    }

    return { success: true as const };
  }

  const affectedProductIds = new Set<string>();
  const rows: Array<{
    quote_id: string;
    quote_item_id: string;
    product_id: string;
    quantity: number;
    stock_yangjae: number;
    stock_uiwang: number;
  }> = [];

  for (const item of reservableItems) {
    const productId = item.product_id!;
    const quantity = Math.round(Number(item.quantity) || 0);

    const deductResult = await applyPhysicalReservationDeduct(
      supabase,
      productId,
      quantity,
      reserveNote,
    );

    if ("error" in deductResult) {
      return deductResult;
    }

    if (!("taken" in deductResult)) {
      return { error: "재고 차감에 실패했습니다." };
    }

    affectedProductIds.add(productId);
    rows.push({
      quote_id: quoteId,
      quote_item_id: item.id,
      product_id: productId,
      quantity,
      stock_yangjae: deductResult.taken.stock_yangjae,
      stock_uiwang: deductResult.taken.stock_uiwang,
    });
  }

  const { error: insertError } = await supabase
    .from("quote_reservations")
    .insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  const { error: quoteUpdateError } = await supabase
    .from("quotes")
    .update({ is_reserved: true })
    .eq("id", quoteId);

  if (quoteUpdateError && !quoteUpdateError.message.includes("is_reserved")) {
    return { error: quoteUpdateError.message };
  }

  return syncProductsReservedQuantities(supabase, [...affectedProductIds]);
}
