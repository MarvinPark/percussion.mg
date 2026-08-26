"use server";

import {
  fetchBusinessPartners,
  mapBusinessPartnerSuggestion,
  normalizeBusinessPartnerInput,
  normalizeOptionalText,
} from "@/lib/business-partners";
import { requirePermission } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessPartnerInput,
  BusinessPartnerType,
} from "@/types/business-partner";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parsePartnerType(value: string): BusinessPartnerType {
  if (value === "business" || value === "foreigner") return value;
  return "individual";
}

function parsePartnerInput(formData: FormData): BusinessPartnerInput {
  return {
    partner_type: parsePartnerType(String(formData.get("partner_type") ?? "individual")),
    display_name: String(formData.get("display_name") ?? ""),
    contact_name:
      normalizeOptionalText(String(formData.get("contact_name") ?? "")) ?? undefined,
    contact_phone:
      normalizeOptionalText(String(formData.get("contact_phone") ?? "")) ?? undefined,
    contact_email:
      normalizeOptionalText(String(formData.get("contact_email") ?? "")) ?? undefined,
    contact_address:
      normalizeOptionalText(String(formData.get("contact_address") ?? "")) ?? undefined,
    corp_num: normalizeOptionalText(String(formData.get("corp_num") ?? "")) ?? undefined,
    corp_name: normalizeOptionalText(String(formData.get("corp_name") ?? "")) ?? undefined,
    ceo_name: normalizeOptionalText(String(formData.get("ceo_name") ?? "")) ?? undefined,
    biz_type: normalizeOptionalText(String(formData.get("biz_type") ?? "")) ?? undefined,
    biz_class: normalizeOptionalText(String(formData.get("biz_class") ?? "")) ?? undefined,
    invoice_address:
      normalizeOptionalText(String(formData.get("invoice_address") ?? "")) ?? undefined,
    invoice_email:
      normalizeOptionalText(String(formData.get("invoice_email") ?? "")) ?? undefined,
    invoice_tax_reg_id:
      normalizeOptionalText(String(formData.get("invoice_tax_reg_id") ?? "")) ??
      undefined,
    invoice_contact_name:
      normalizeOptionalText(String(formData.get("invoice_contact_name") ?? "")) ??
      undefined,
    invoice_contact_dept:
      normalizeOptionalText(String(formData.get("invoice_contact_dept") ?? "")) ??
      undefined,
    invoice_contact_tel:
      normalizeOptionalText(String(formData.get("invoice_contact_tel") ?? "")) ??
      undefined,
    invoice_contact_hp:
      normalizeOptionalText(String(formData.get("invoice_contact_hp") ?? "")) ??
      undefined,
    invoice_contact_name2:
      normalizeOptionalText(String(formData.get("invoice_contact_name2") ?? "")) ??
      undefined,
    invoice_contact_dept2:
      normalizeOptionalText(String(formData.get("invoice_contact_dept2") ?? "")) ??
      undefined,
    invoice_contact_tel2:
      normalizeOptionalText(String(formData.get("invoice_contact_tel2") ?? "")) ??
      undefined,
    invoice_contact_hp2:
      normalizeOptionalText(String(formData.get("invoice_contact_hp2") ?? "")) ??
      undefined,
    invoice_contact_email2:
      normalizeOptionalText(String(formData.get("invoice_contact_email2") ?? "")) ??
      undefined,
    memo: normalizeOptionalText(String(formData.get("memo") ?? "")) ?? undefined,
  };
}

function validatePartnerInput(input: BusinessPartnerInput): string | null {
  if (!input.display_name.trim()) {
    return "거래처 표시명을 입력해 주세요.";
  }
  return null;
}

export async function createBusinessPartner(formData: FormData) {
  const auth = await requirePermission("managePartners");
  if ("error" in auth) {
    return { error: auth.error ?? "거래처 등록 권한이 없습니다." };
  }

  const parsed = parsePartnerInput(formData);
  const validationError = validatePartnerInput(parsed);
  if (validationError) {
    return { error: validationError };
  }

  const payload = normalizeBusinessPartnerInput(parsed);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_partners")
    .insert({
      ...payload,
      source: "manual",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 등록번호의 거래처가 이미 있습니다." };
    }
    return { error: "거래처 등록에 실패했습니다." };
  }

  revalidatePath("/partners");
  redirect(`/partners/${data.id}/edit`);
}

export async function updateBusinessPartner(formData: FormData) {
  const auth = await requirePermission("managePartners");
  if ("error" in auth) {
    return { error: auth.error ?? "거래처 수정 권한이 없습니다." };
  }

  const id = String(formData.get("partner_id") ?? "");
  if (!id) return { error: "거래처 ID가 없습니다." };

  const parsed = parsePartnerInput(formData);
  const validationError = validatePartnerInput(parsed);
  if (validationError) {
    return { error: validationError };
  }

  const payload = normalizeBusinessPartnerInput(parsed);
  const supabase = await createClient();

  const { error } = await supabase
    .from("business_partners")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 등록번호의 거래처가 이미 있습니다." };
    }
    return { error: "거래처 수정에 실패했습니다." };
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${id}/edit`);
  return { success: true };
}

export async function deleteBusinessPartner(formData: FormData) {
  const auth = await requirePermission("managePartners");
  if ("error" in auth) {
    return { error: auth.error ?? "거래처 삭제 권한이 없습니다." };
  }

  const id = String(formData.get("partner_id") ?? "");
  if (!id) return { error: "거래처 ID가 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("business_partners").delete().eq("id", id);

  if (error) {
    return { error: "거래처 삭제에 실패했습니다." };
  }

  revalidatePath("/partners");
  redirect("/partners");
}

export async function searchBusinessPartnersForAutocomplete(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 1) {
    return { partners: [] as ReturnType<typeof mapBusinessPartnerSuggestion>[] };
  }

  const supabase = await createClient();
  const { partners, error } = await fetchBusinessPartners(supabase, {
    search: trimmed,
    limit: 12,
  });

  if (error) {
    return { partners: [] as ReturnType<typeof mapBusinessPartnerSuggestion>[] };
  }

  return { partners: partners.map(mapBusinessPartnerSuggestion) };
}

export async function updatePartnerMemo(partnerId: string, memo: string | null) {
  const auth = await requirePermission("managePartners");
  if ("error" in auth) {
    return { error: auth.error ?? "거래처 수정 권한이 없습니다." };
  }

  if (!partnerId) {
    return { error: "거래처 ID가 없습니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_partners")
    .update({
      memo: normalizeOptionalText(memo ?? ""),
      updated_at: new Date().toISOString(),
    })
    .eq("id", partnerId)
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("memo")) {
      return {
        error:
          "메모 컬럼이 없습니다. Supabase에서 schema-business-partners-update.sql을 실행해 주세요.",
      };
    }
    return { error: "메모 저장에 실패했습니다." };
  }

  if (!data) {
    return { error: "거래처를 찾을 수 없습니다." };
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}/edit`);
  return { success: true as const, memo: normalizeOptionalText(memo ?? "") };
}
