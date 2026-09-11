"use server";

import {
  computeInvoiceReady,
  fetchBusinessPartners,
  mapBusinessPartnerSuggestion,
  normalizeBusinessPartnerInput,
  normalizeOptionalText,
  normalizeRegNum,
} from "@/lib/business-partners";
import type { PartnerInlineField } from "@/lib/partner-inline-field";
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

  const supabase = await createClient();
  const { partners, error } = await fetchBusinessPartners(supabase, {
    search: trimmed || undefined,
    limit: trimmed ? 20 : 50,
  });

  if (error) {
    return { partners: [] as ReturnType<typeof mapBusinessPartnerSuggestion>[] };
  }

  return { partners: partners.map(mapBusinessPartnerSuggestion) };
}

export async function updatePartnerInlineField(
  partnerId: string,
  field: PartnerInlineField,
  value: string,
) {
  const auth = await requirePermission("managePartners");
  if ("error" in auth) {
    return { error: auth.error ?? "거래처 수정 권한이 없습니다." };
  }

  if (!partnerId) {
    return { error: "거래처 ID가 없습니다." };
  }

  const supabase = await createClient();
  const { data: partner, error: fetchError } = await supabase
    .from("business_partners")
    .select("*")
    .eq("id", partnerId)
    .maybeSingle();

  if (fetchError) {
    return { error: "거래처를 불러오지 못했습니다." };
  }

  if (!partner) {
    return { error: "거래처를 찾을 수 없습니다." };
  }

  const updatePayload: Record<string, string | null | boolean> = {
    updated_at: new Date().toISOString(),
  };
  let savedValue: string | null = null;

  switch (field) {
    case "display_name": {
      const trimmed = value.trim();
      if (!trimmed) {
        return { error: "상호를 입력해 주세요." };
      }
      savedValue = trimmed;
      if (partner.corp_name) {
        updatePayload.corp_name = trimmed;
      } else {
        updatePayload.display_name = trimmed;
      }
      break;
    }
    case "corp_num": {
      savedValue = normalizeRegNum(value, partner.partner_type);
      if (value.trim() && !savedValue) {
        return { error: "등록번호 형식이 올바르지 않습니다." };
      }
      updatePayload.corp_num = savedValue;
      break;
    }
    case "ceo_name":
      savedValue = normalizeOptionalText(value);
      updatePayload.ceo_name = savedValue;
      break;
    case "phone":
      savedValue = normalizeOptionalText(value);
      updatePayload.contact_phone = savedValue;
      break;
    case "email": {
      savedValue = normalizeOptionalText(value);
      if (partner.invoice_email) {
        updatePayload.invoice_email = savedValue;
      } else {
        updatePayload.contact_email = savedValue;
      }
      break;
    }
    case "address": {
      savedValue = normalizeOptionalText(value);
      if (partner.invoice_address) {
        updatePayload.invoice_address = savedValue;
      } else {
        updatePayload.contact_address = savedValue;
      }
      break;
    }
    case "biz_type":
      savedValue = normalizeOptionalText(value);
      updatePayload.biz_type = savedValue;
      break;
    case "biz_class":
      savedValue = normalizeOptionalText(value);
      updatePayload.biz_class = savedValue;
      break;
    case "memo":
      savedValue = normalizeOptionalText(value);
      updatePayload.memo = savedValue;
      break;
    default:
      return { error: "수정할 수 없는 항목입니다." };
  }

  const nextPartner = {
    ...partner,
    ...updatePayload,
  };

  updatePayload.invoice_ready = computeInvoiceReady({
    partner_type: nextPartner.partner_type,
    corp_num: nextPartner.corp_num,
    corp_name: nextPartner.corp_name,
    display_name: nextPartner.display_name,
    ceo_name: nextPartner.ceo_name,
    biz_type: nextPartner.biz_type,
    biz_class: nextPartner.biz_class,
    invoice_address: nextPartner.invoice_address,
    contact_address: nextPartner.contact_address,
    invoice_email: nextPartner.invoice_email,
    contact_email: nextPartner.contact_email,
  });

  const { data, error } = await supabase
    .from("business_partners")
    .update(updatePayload)
    .eq("id", partnerId)
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message ?? "";
    if (field === "memo" && message.includes("memo")) {
      return {
        error:
          "메모 컬럼이 없습니다. Supabase에서 schema-business-partners-update.sql을 실행해 주세요.",
      };
    }
    if (error.code === "23505") {
      return { error: "같은 등록번호의 거래처가 이미 있습니다." };
    }
    return { error: "거래처 저장에 실패했습니다." };
  }

  if (!data) {
    return { error: "거래처를 찾을 수 없습니다." };
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}/edit`);
  return { success: true as const, field, value: savedValue };
}

/** @deprecated use updatePartnerInlineField */
export async function updatePartnerMemo(partnerId: string, memo: string | null) {
  const result = await updatePartnerInlineField(partnerId, "memo", memo ?? "");
  if ("error" in result && result.error) {
    return { error: result.error };
  }
  if (!("success" in result) || !result.success) {
    return { error: "메모 저장에 실패했습니다." };
  }
  return { success: true as const, memo: result.value };
}
