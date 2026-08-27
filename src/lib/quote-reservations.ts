import {
  isShippingFeeQuoteItem,
  isStoreFulfillment,
} from "@/lib/quote-fulfillment";
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

export function getReservableQuoteItems(items: QuoteItemForReservation[]) {
  return items.filter(
    (item) =>
      item.product_id &&
      isStoreFulfillment(item.fulfillment_location) &&
      !isShippingFeeQuoteItem(item) &&
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

export async function releaseQuoteReservations(
  supabase: SupabaseClient,
  quoteId: string,
  options?: { keepIntent?: boolean },
) {
  const { data: reservations, error: fetchError } = await supabase
    .from("quote_reservations")
    .select("product_id")
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

  const { error: deleteError } = await supabase
    .from("quote_reservations")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteError) {
    return { error: deleteError.message };
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

  return syncProductsReservedQuantities(supabase, productIds);
}

export async function applyQuoteReservations(
  supabase: SupabaseClient,
  quoteId: string,
  items: QuoteItemForReservation[],
) {
  const reservableItems = getReservableQuoteItems(items);

  const { data: existing, error: existingError } = await supabase
    .from("quote_reservations")
    .select("product_id")
    .eq("quote_id", quoteId);

  if (existingError) {
    if (existingError.message.includes("quote_reservations")) {
      return {
        error:
          "quote_reservations 테이블이 없습니다. supabase/schema-quote-reservations.sql을 실행해 주세요.",
      };
    }
    return { error: existingError.message };
  }

  const affectedProductIds = new Set(
    (existing ?? [])
      .map((row) => row.product_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const { error: deleteError } = await supabase
    .from("quote_reservations")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (reservableItems.length === 0) {
    const { error: quoteUpdateError } = await supabase
      .from("quotes")
      .update({ is_reserved: false })
      .eq("id", quoteId);

    if (quoteUpdateError && !quoteUpdateError.message.includes("is_reserved")) {
      return { error: quoteUpdateError.message };
    }

    return syncProductsReservedQuantities(supabase, [...affectedProductIds]);
  }

  const rows = reservableItems.map((item) => {
    affectedProductIds.add(item.product_id!);
    return {
      quote_id: quoteId,
      quote_item_id: item.id,
      product_id: item.product_id!,
      quantity: Math.round(Number(item.quantity) || 0),
    };
  });

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
