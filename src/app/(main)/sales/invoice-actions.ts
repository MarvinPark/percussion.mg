"use server";

import {
  normalizeBusinessPartnerInput,
  missingInvoiceFields,
  mapBusinessPartnerRow,
} from "@/lib/business-partners";
import {
  buildTaxInvoiceMgtKey,
  buildTaxInvoicePayload,
  registPopbillTaxInvoice,
  resolveInvoicePartnerContext,
  splitVatInclusive,
  validatePartnerForIssue,
} from "@/lib/popbill/taxinvoice";
import { getPopbillEnv, isPopbillConfigured } from "@/lib/popbill/env";
import {
  assertPopbillReadyForIssue,
  formatPopbillErrorMessage,
  getPopbillIssueStatus,
  type PopbillIssueStatus,
} from "@/lib/popbill/readiness";
import { requirePermission } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { BusinessPartner, BusinessPartnerInput } from "@/types/business-partner";
import { revalidatePath } from "next/cache";
import {
  getTodayIsoDate,
  isoDateToPopbillDate,
  validateTaxInvoiceIsoDate,
} from "@/lib/tax-invoice-dates";

const DEFAULT_ITEM_NAME = "악기";

export type TaxInvoiceIssueContext = {
  saleCount: number;
  totalAmount: number;
  supplyCost: number;
  tax: number;
  displayName: string;
  partnerId: string | null;
  partner: BusinessPartner | null;
  missing: string[];
  invoiceReady: boolean;
};

async function loadSalesForInvoice(saleIds: string[]) {
  const supabase = await createClient();
  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, total_amount, partner_id, business_partner, sold_at")
    .in("id", saleIds);

  if (error) {
    return { error: "매출 정보를 불러오지 못했습니다." as const };
  }

  if (!sales?.length || sales.length !== saleIds.length) {
    return { error: "선택한 매출 중 일부를 찾을 수 없습니다." as const };
  }

  return { supabase, sales } as const;
}

export async function getTaxInvoiceIssueContext(input: {
  saleIds: string[];
}): Promise<{ context: TaxInvoiceIssueContext } | { error: string }> {
  const saleIds = [...new Set(input.saleIds.map((id) => id.trim()).filter(Boolean))];
  if (saleIds.length === 0) {
    return { error: "발행할 매출을 선택해 주세요." };
  }

  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  const loaded = await loadSalesForInvoice(saleIds);
  if ("error" in loaded) return { error: loaded.error ?? "매출 정보를 불러오지 못했습니다." };

  const partnerContext = await resolveInvoicePartnerContext(
    loaded.supabase,
    loaded.sales,
  );
  if ("error" in partnerContext) {
    return { error: partnerContext.error };
  }

  const totalAmount = loaded.sales.reduce(
    (sum, sale) => sum + (Number(sale.total_amount) || 0),
    0,
  );
  const { supplyCost, tax } = splitVatInclusive(totalAmount);

  return {
    context: {
      saleCount: loaded.sales.length,
      totalAmount,
      supplyCost,
      tax,
      displayName: partnerContext.displayName,
      partnerId: partnerContext.partner?.id ?? null,
      partner: partnerContext.partner,
      missing: partnerContext.missing,
      invoiceReady: partnerContext.invoiceReady,
    },
  };
}

export async function savePartnerForTaxInvoiceIssue(input: {
  saleIds: string[];
  partner: BusinessPartnerInput & { partnerId?: string | null };
}) {
  const saleIds = [...new Set(input.saleIds.map((id) => id.trim()).filter(Boolean))];
  if (saleIds.length === 0) {
    return { error: "매출이 선택되지 않았습니다." };
  }

  if (!input.partner.display_name?.trim()) {
    return { error: "거래처명을 입력해 주세요." };
  }

  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  const normalized = normalizeBusinessPartnerInput(input.partner);
  if (!normalized.display_name) {
    return { error: "거래처명을 입력해 주세요." };
  }

  const loaded = await loadSalesForInvoice(saleIds);
  if ("error" in loaded) return { error: loaded.error ?? "매출 정보를 불러오지 못했습니다." };

  const supabase = loaded.supabase;
  const partnerId = input.partner.partnerId?.trim() ?? "";
  const now = new Date().toISOString();
  let savedPartnerId = partnerId;

  if (partnerId) {
    const { error: updateError } = await supabase
      .from("business_partners")
      .update({
        ...normalized,
        updated_at: now,
      })
      .eq("id", partnerId);

    if (updateError) {
      return { error: "거래처 정보 저장에 실패했습니다." };
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("business_partners")
      .insert({
        ...normalized,
        source: "sale",
        last_used_at: now,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: "거래처 등록에 실패했습니다." };
    }

    savedPartnerId = String(created.id);
  }

  const { error: linkError } = await supabase
    .from("sales")
    .update({
      partner_id: savedPartnerId,
      business_partner: normalized.display_name,
    })
    .in("id", saleIds);

  if (linkError) {
    return { error: "매출에 거래처를 연결하지 못했습니다." };
  }

  const { data: partnerRow, error: fetchError } = await supabase
    .from("business_partners")
    .select("*")
    .eq("id", savedPartnerId)
    .single();

  if (fetchError || !partnerRow) {
    return { error: "저장된 거래처 정보를 불러오지 못했습니다." };
  }

  const partner = mapBusinessPartnerRow(partnerRow);

  const missing = partner.invoice_ready ? [] : missingInvoiceFields(partner);

  revalidatePath("/sales");
  revalidatePath("/partners");

  return {
    success: true as const,
    partnerId: savedPartnerId,
    partner,
    missing,
    invoiceReady: partner.invoice_ready,
  };
}

export async function getTaxInvoicePopbillStatus(): Promise<
  PopbillIssueStatus | { error: string }
> {
  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  if (!isPopbillConfigured()) {
    return {
      error:
        "Popbill 환경 변수가 설정되지 않았습니다. POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM을 확인해 주세요.",
    };
  }

  try {
    return await getPopbillIssueStatus();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Popbill 상태를 확인하지 못했습니다.",
    };
  }
}

export async function issueTaxInvoiceFromSales(input: {
  saleIds: string[];
  itemName?: string;
  purposeType?: "영수" | "청구";
  writeDate?: string;
  itemPurchaseDate?: string;
  partner?: (BusinessPartnerInput & { partnerId?: string | null }) | null;
}) {
  const saleIds = [...new Set(input.saleIds.map((id) => id.trim()).filter(Boolean))];
  if (saleIds.length === 0) {
    return { error: "발행할 매출을 선택해 주세요." };
  }

  if (!isPopbillConfigured()) {
    return {
      error:
        "Popbill 환경 변수가 설정되지 않았습니다. POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM을 확인해 주세요.",
    };
  }

  const auth = await requirePermission("manageSales");
  if ("error" in auth) return { error: auth.error ?? "권한이 없습니다." };

  if (input.partner) {
    const saveResult = await savePartnerForTaxInvoiceIssue({
      saleIds,
      partner: input.partner,
    });
    if ("error" in saveResult) {
      return { error: saveResult.error };
    }
    if (!saveResult.invoiceReady) {
      return {
        error: `세금계산서 발행 정보가 부족합니다: ${saveResult.missing.join(", ")}`,
        partnerId: saveResult.partnerId,
      };
    }
  }

  const loaded = await loadSalesForInvoice(saleIds);
  if ("error" in loaded) return { error: loaded.error ?? "매출 정보를 불러오지 못했습니다." };

  const partnerContext = await resolveInvoicePartnerContext(
    loaded.supabase,
    loaded.sales,
  );
  if ("error" in partnerContext) {
    return { error: partnerContext.error };
  }

  if (!partnerContext.partner) {
    return {
      error: "거래처 정보를 입력한 뒤 발행해 주세요.",
    };
  }

  const validation = validatePartnerForIssue(partnerContext.partner);
  if (!("ok" in validation)) {
    return { error: validation.error, partnerId: validation.partnerId };
  }

  const totalAmount = loaded.sales.reduce(
    (sum, sale) => sum + (Number(sale.total_amount) || 0),
    0,
  );

  if (totalAmount <= 0) {
    return { error: "발행할 금액이 0원입니다." };
  }

  const writeDateIso = input.writeDate?.trim() || getTodayIsoDate();
  const itemPurchaseDateIso =
    input.itemPurchaseDate?.trim() || writeDateIso;

  const writeDateError = validateTaxInvoiceIsoDate(writeDateIso);
  if (writeDateError) {
    return { error: `작성일자: ${writeDateError}` };
  }

  const itemDateError = validateTaxInvoiceIsoDate(itemPurchaseDateIso);
  if (itemDateError) {
    return { error: `품목일자: ${itemDateError}` };
  }

  const itemName = input.itemName?.trim() || DEFAULT_ITEM_NAME;
  const mgtKey = buildTaxInvoiceMgtKey(saleIds);

  const taxinvoice = buildTaxInvoicePayload({
    partner: partnerContext.partner,
    totalAmount,
    itemName,
    writeDate: isoDateToPopbillDate(writeDateIso),
    itemPurchaseDate: isoDateToPopbillDate(itemPurchaseDateIso),
    mgtKey,
    purposeType: input.purposeType,
  });

  const readiness = await assertPopbillReadyForIssue();
  if ("error" in readiness) {
    return { error: readiness.error };
  }

  const { supplyCost, tax: taxAmount } = splitVatInclusive(totalAmount);
  const purposeType = input.purposeType ?? "영수";

  try {
    const result = await registPopbillTaxInvoice(taxinvoice);

    const ntsConfirmNum =
      (result.ntsconfirmNum as string | undefined) ??
      (result.confirmNum as string | undefined) ??
      null;
    const popbillCode =
      typeof result.code === "number"
        ? result.code
        : Number(result.code) || null;
    const popbillMessage =
      result.message != null ? String(result.message) : null;

    const partner = partnerContext.partner;
    const { error: insertError } = await loaded.supabase
      .from("tax_invoice_issues")
      .insert({
        mgt_key: mgtKey,
        partner_id: partner.id,
        partner_name: partner.display_name,
        partner_corp_num: partner.corp_num,
        partner_email: partner.invoice_email || partner.contact_email,
        sale_ids: saleIds,
        sale_count: loaded.sales.length,
        item_name: itemName,
        purpose_type: purposeType,
        write_date: writeDateIso,
        item_purchase_date: itemPurchaseDateIso,
        total_amount: totalAmount,
        supply_cost: supplyCost,
        tax_amount: taxAmount,
        nts_confirm_num: ntsConfirmNum,
        popbill_code: popbillCode,
        popbill_message: popbillMessage,
        issued_by_user_id: auth.userId,
        issued_by_name: auth.name,
        is_test: getPopbillEnv().isTest,
      });

    if (insertError) {
      console.error("세금계산서 발행 내역 저장 실패:", insertError.message);
    }

    revalidatePath("/sales");
    revalidatePath("/sales/tax-invoices");

    return {
      success: true as const,
      mgtKey,
      ntsConfirmNum,
      totalAmount,
      itemName,
      saleCount: loaded.sales.length,
      partnerName: partner.display_name,
    };
  } catch (error) {
    return { error: formatPopbillErrorMessage(error) };
  }
}
