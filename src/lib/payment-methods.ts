import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@/types/sale";

export const DEFAULT_PAYMENT_METHOD_NAME = "현금영수증";

export function getDefaultPaymentMethodId(
  methods: PaymentMethod[],
): string {
  if (!methods.length) return "";

  const exact = methods.find(
    (method) => method.name.trim() === DEFAULT_PAYMENT_METHOD_NAME,
  );
  if (exact) return exact.id;

  const partial = methods.find((method) =>
    method.name.includes(DEFAULT_PAYMENT_METHOD_NAME),
  );
  if (partial) return partial.id;

  return methods[0]?.id ?? "";
}

export function normalizePaymentMethods(
  rows: Array<{
    id: string;
    name: string;
    fee_rate: number | string | null;
    sort_order: number | string | null;
  }> | null,
): PaymentMethod[] {
  return sortPaymentMethods(
    (rows ?? []).map((method) => ({
      id: method.id,
      name: method.name,
      fee_rate: Number(method.fee_rate) || 0,
      sort_order: Number(method.sort_order) || 0,
    })),
  );
}

export function sortPaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return [...methods].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "ko"),
  );
}

export async function fetchPaymentMethods(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, fee_rate, sort_order")
    .order("sort_order", { ascending: true });

  return {
    paymentMethods: normalizePaymentMethods(data),
    error,
  };
}
