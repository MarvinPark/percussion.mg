import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BusinessPartner,
  BusinessPartnerInput,
  BusinessPartnerType,
} from "@/types/business-partner";

const FOREIGNER_REG_NUM = "9999999999999";

export function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function normalizeRegNum(
  value: string | null | undefined,
  partnerType: BusinessPartnerType,
): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;

  if (partnerType === "foreigner") {
    return digits.length === 13 ? digits : null;
  }

  if (partnerType === "individual") {
    return digits.length === 13 ? digits : null;
  }

  return digits.length === 10 ? digits : null;
}

export function normalizeTaxRegId(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 4 ? digits : null;
}

export function computeInvoiceReady(input: {
  partner_type: BusinessPartnerType;
  corp_num: string | null;
  corp_name: string | null;
  display_name: string;
  ceo_name: string | null;
  biz_type: string | null;
  biz_class: string | null;
  invoice_address: string | null;
  contact_address: string | null;
  invoice_email: string | null;
  contact_email: string | null;
}): boolean {
  if (!input.corp_num?.trim()) return false;

  const corpName = input.corp_name?.trim() || input.display_name.trim();
  if (!corpName) return false;

  const email = input.invoice_email?.trim() || input.contact_email?.trim();
  if (!email) return false;

  if (input.partner_type === "business") {
    if (input.corp_num.replace(/\D/g, "").length !== 10) return false;
    if (!input.ceo_name?.trim()) return false;
    return true;
  }

  if (input.partner_type === "individual") {
    return input.corp_num.replace(/\D/g, "").length === 13;
  }

  const digits = input.corp_num.replace(/\D/g, "");
  return digits === FOREIGNER_REG_NUM || digits.length === 13;
}

export function normalizeBusinessPartnerInput(input: BusinessPartnerInput) {
  const display_name = input.display_name.trim();
  const partner_type = input.partner_type;
  const corp_num = normalizeRegNum(input.corp_num, partner_type);
  const corp_name = normalizeOptionalText(input.corp_name);
  const contact_address = normalizeOptionalText(input.contact_address);
  const invoice_address = normalizeOptionalText(input.invoice_address);
  const contact_email = normalizeOptionalText(input.contact_email);
  const invoice_email = normalizeOptionalText(input.invoice_email);

  const normalized = {
    partner_type,
    display_name,
    contact_name: normalizeOptionalText(input.contact_name),
    contact_phone: normalizeOptionalText(input.contact_phone),
    contact_email,
    contact_address,
    corp_num,
    corp_name: corp_name ?? (corp_num ? display_name : null),
    ceo_name: normalizeOptionalText(input.ceo_name),
    biz_type: normalizeOptionalText(input.biz_type),
    biz_class: normalizeOptionalText(input.biz_class),
    invoice_address,
    invoice_email,
    invoice_tax_reg_id: normalizeTaxRegId(input.invoice_tax_reg_id),
    invoice_contact_name: normalizeOptionalText(input.invoice_contact_name),
    invoice_contact_dept: normalizeOptionalText(input.invoice_contact_dept),
    invoice_contact_tel: normalizeOptionalText(input.invoice_contact_tel),
    invoice_contact_hp: normalizeOptionalText(input.invoice_contact_hp),
    invoice_contact_name2: normalizeOptionalText(input.invoice_contact_name2),
    invoice_contact_dept2: normalizeOptionalText(input.invoice_contact_dept2),
    invoice_contact_tel2: normalizeOptionalText(input.invoice_contact_tel2),
    invoice_contact_hp2: normalizeOptionalText(input.invoice_contact_hp2),
    invoice_contact_email2: normalizeOptionalText(input.invoice_contact_email2),
    memo: normalizeOptionalText(input.memo),
  };

  return {
    ...normalized,
    invoice_ready: computeInvoiceReady({
      partner_type: normalized.partner_type,
      corp_num: normalized.corp_num,
      corp_name: normalized.corp_name,
      display_name,
      ceo_name: normalized.ceo_name,
      biz_type: normalized.biz_type,
      biz_class: normalized.biz_class,
      invoice_address: normalized.invoice_address,
      contact_address: normalized.contact_address,
      invoice_email: normalized.invoice_email,
      contact_email: normalized.contact_email,
    }),
  };
}

export function mapBusinessPartnerRow(row: Record<string, unknown>): BusinessPartner {
  const partner = {
    id: String(row.id),
    partner_type: row.partner_type as BusinessPartnerType,
    display_name: String(row.display_name ?? ""),
    contact_name: (row.contact_name as string | null) ?? null,
    contact_phone: (row.contact_phone as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    contact_address: (row.contact_address as string | null) ?? null,
    corp_num: (row.corp_num as string | null) ?? null,
    corp_name: (row.corp_name as string | null) ?? null,
    ceo_name: (row.ceo_name as string | null) ?? null,
    biz_type: (row.biz_type as string | null) ?? null,
    biz_class: (row.biz_class as string | null) ?? null,
    invoice_address: (row.invoice_address as string | null) ?? null,
    invoice_email: (row.invoice_email as string | null) ?? null,
    invoice_tax_reg_id: (row.invoice_tax_reg_id as string | null) ?? null,
    invoice_contact_name: (row.invoice_contact_name as string | null) ?? null,
    invoice_contact_dept: (row.invoice_contact_dept as string | null) ?? null,
    invoice_contact_tel: (row.invoice_contact_tel as string | null) ?? null,
    invoice_contact_hp: (row.invoice_contact_hp as string | null) ?? null,
    invoice_contact_name2: (row.invoice_contact_name2 as string | null) ?? null,
    invoice_contact_dept2: (row.invoice_contact_dept2 as string | null) ?? null,
    invoice_contact_tel2: (row.invoice_contact_tel2 as string | null) ?? null,
    invoice_contact_hp2: (row.invoice_contact_hp2 as string | null) ?? null,
    invoice_contact_email2: (row.invoice_contact_email2 as string | null) ?? null,
    memo: (row.memo as string | null) ?? null,
    source: row.source as BusinessPartner["source"],
    last_used_at: (row.last_used_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };

  return {
    ...partner,
    invoice_ready: computeInvoiceReady({
      partner_type: partner.partner_type,
      corp_num: partner.corp_num,
      corp_name: partner.corp_name,
      display_name: partner.display_name,
      ceo_name: partner.ceo_name,
      biz_type: partner.biz_type,
      biz_class: partner.biz_class,
      invoice_address: partner.invoice_address,
      contact_address: partner.contact_address,
      invoice_email: partner.invoice_email,
      contact_email: partner.contact_email,
    }),
  };
}

export async function fetchBusinessPartners(
  supabase: SupabaseClient,
  options?: { search?: string; limit?: number },
) {
  let query = supabase
    .from("business_partners")
    .select("*")
    .order("display_name", { ascending: true })
    .limit(options?.limit ?? 5000);

  const search = options?.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_,]/g, "")}%`;
    query = query.or(
      [
        `display_name.ilike.${pattern}`,
        `corp_name.ilike.${pattern}`,
        `ceo_name.ilike.${pattern}`,
        `memo.ilike.${pattern}`,
        `contact_name.ilike.${pattern}`,
        `corp_num.ilike.${pattern}`,
        `contact_phone.ilike.${pattern}`,
        `invoice_contact_name.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  return {
    partners: (data ?? []).map((row) => mapBusinessPartnerRow(row)),
    error: error?.message ?? null,
  };
}

export async function fetchBusinessPartnerById(
  supabase: SupabaseClient,
  id: string,
) {
  const { data, error } = await supabase
    .from("business_partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { partner: null, error: error.message };
  }

  if (!data) {
    return { partner: null, error: "거래처를 찾을 수 없습니다." };
  }

  return { partner: mapBusinessPartnerRow(data), error: null };
}

export function formatRegNum(
  value: string | null | undefined,
  partnerType: BusinessPartnerType = "business",
): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return "-";

  if (partnerType === "business" && digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  if (partnerType === "individual" && digits.length === 13) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

/** @deprecated use formatRegNum */
export function formatCorpNum(
  value: string | null | undefined,
  partnerType: BusinessPartnerType = "business",
): string {
  return formatRegNum(value, partnerType);
}

export function missingInvoiceFields(partner: BusinessPartner): string[] {
  const missing: string[] = [];

  if (!partner.corp_num) {
    missing.push(REG_NUM_LABEL(partner.partner_type));
  }

  if (!partner.corp_name?.trim() && !partner.display_name.trim()) {
    missing.push("상호");
  }

  if (partner.partner_type === "business" && !partner.ceo_name?.trim()) {
    missing.push("대표자");
  }

  if (!partner.invoice_email?.trim() && !partner.contact_email?.trim()) {
    missing.push("이메일");
  }

  return missing;
}

function REG_NUM_LABEL(partnerType: BusinessPartnerType): string {
  if (partnerType === "individual") return "주민등록번호";
  if (partnerType === "foreigner") return "외국인 등록번호";
  return "사업자등록번호";
}

export type BusinessPartnerSuggestion = {
  id: string;
  display_name: string;
  corp_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  partner_type: BusinessPartnerType;
  invoice_ready: boolean;
  corp_num: string | null;
  ceo_name: string | null;
  memo: string | null;
  biz_type: string | null;
  biz_class: string | null;
  invoice_address: string | null;
  invoice_email: string | null;
  invoice_tax_reg_id: string | null;
};

export type PartnerSaveContext = {
  partner_id?: string | null;
  business_partner?: string | null;
  source: "quote" | "sale";
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_address?: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function mapBusinessPartnerSuggestion(
  partner: BusinessPartner,
): BusinessPartnerSuggestion {
  return {
    id: partner.id,
    display_name: partner.display_name,
    corp_name: partner.corp_name,
    contact_name: partner.contact_name,
    contact_phone: partner.contact_phone,
    contact_email: partner.contact_email,
    contact_address: partner.contact_address,
    partner_type: partner.partner_type,
    invoice_ready: partner.invoice_ready,
    corp_num: partner.corp_num,
    ceo_name: partner.ceo_name,
    memo: partner.memo,
    biz_type: partner.biz_type,
    biz_class: partner.biz_class,
    invoice_address: partner.invoice_address,
    invoice_email: partner.invoice_email,
    invoice_tax_reg_id: partner.invoice_tax_reg_id,
  };
}

export async function resolvePartnerForSave(
  supabase: SupabaseClient,
  context: PartnerSaveContext,
): Promise<{
  partner_id: string | null;
  business_partner: string | null;
  error?: string;
}> {
  const displayName = normalizeOptionalText(context.business_partner);
  const now = new Date().toISOString();
  const partnerId = context.partner_id?.trim() ?? "";

  if (partnerId && isUuid(partnerId)) {
    const { partner, error } = await fetchBusinessPartnerById(supabase, partnerId);
    if (!error && partner) {
      await supabase
        .from("business_partners")
        .update({ last_used_at: now, updated_at: now })
        .eq("id", partner.id);

      return {
        partner_id: partner.id,
        business_partner: displayName ?? partner.display_name,
      };
    }
  }

  if (!displayName) {
    return { partner_id: null, business_partner: null };
  }

  const { data: existingRows, error: lookupError } = await supabase
    .from("business_partners")
    .select("id, display_name")
    .ilike("display_name", displayName)
    .limit(1);

  if (lookupError) {
    return {
      partner_id: null,
      business_partner: displayName,
      error: lookupError.message,
    };
  }

  const existing = existingRows?.[0];
  if (existing) {
    await supabase
      .from("business_partners")
      .update({ last_used_at: now, updated_at: now })
      .eq("id", existing.id);

    return {
      partner_id: existing.id as string,
      business_partner: existing.display_name as string,
    };
  }

  const normalized = normalizeBusinessPartnerInput({
    partner_type: "individual",
    display_name: displayName,
    contact_name: context.contact_name ?? undefined,
    contact_phone: context.contact_phone ?? undefined,
    contact_email: context.contact_email ?? undefined,
    contact_address: context.contact_address ?? undefined,
  });

  const { data: created, error: insertError } = await supabase
    .from("business_partners")
    .insert({
      ...normalized,
      source: context.source,
      last_used_at: now,
    })
    .select("id, display_name")
    .single();

  if (insertError || !created) {
    return {
      partner_id: null,
      business_partner: displayName,
      error: insertError?.message,
    };
  }

  return {
    partner_id: created.id as string,
    business_partner: created.display_name as string,
  };
}

export { FOREIGNER_REG_NUM };
