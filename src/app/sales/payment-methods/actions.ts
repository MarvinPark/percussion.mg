"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidatePaymentPaths() {
  revalidatePath("/sales/payment-methods");
  revalidatePath("/sales/new");
  revalidatePath("/sales");
}

export async function createPaymentMethod(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const fee_rate = Number(formData.get("fee_rate") ?? 0);

  if (!name) return { error: "결제 수단 이름을 입력해 주세요." };
  if (Number.isNaN(fee_rate) || fee_rate < 0) {
    return { error: "수수료율은 0 이상 숫자여야 합니다." };
  }

  const supabase = await createClient();

  const { data: lastMethod } = await supabase
    .from("payment_methods")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (lastMethod?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("payment_methods").insert({
    name,
    fee_rate,
    sort_order,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 이름의 결제 수단이 이미 있습니다." };
    }
    return { error: "결제 수단 추가에 실패했습니다." };
  }

  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function updatePaymentMethod(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const fee_rate = Number(formData.get("fee_rate") ?? 0);

  if (!id) return { error: "수정할 결제 수단을 찾을 수 없습니다." };
  if (!name) return { error: "결제 수단 이름을 입력해 주세요." };
  if (Number.isNaN(fee_rate) || fee_rate < 0) {
    return { error: "수수료율은 0 이상 숫자여야 합니다." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("payment_methods")
    .update({ name, fee_rate })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 이름의 결제 수단이 이미 있습니다." };
    }
    return { error: "결제 수단 수정에 실패했습니다." };
  }

  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function deletePaymentMethod(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "삭제할 결제 수단을 찾을 수 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);

  if (error) {
    return { error: "결제 수단 삭제에 실패했습니다." };
  }

  revalidatePaymentPaths();
  return { ok: true as const };
}
