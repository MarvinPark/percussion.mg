import "server-only";

import {
  fetchBusinessPartnerById,
  missingInvoiceFields,
} from "@/lib/business-partners";
import { getPopbillCorpNum, getPopbillTaxinvoiceService } from "@/lib/popbill/client";
import { getPopbillSupplierFields } from "@/lib/popbill/supplier-info";
import { promisifyPopbill } from "@/lib/popbill/test-connection";
import type { BusinessPartner, BusinessPartnerType } from "@/types/business-partner";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PopbillTaxinvoiceDetail = {
  serialNum: number;
  purchaseDT: string;
  itemName: string;
  spec?: string;
  qty: string;
  unitCost: string;
  supplyCost: string;
  tax: string;
  remark?: string;
};

export type PopbillTaxinvoicePayload = {
  writeDate: string;
  chargeDirection: string;
  issueType: string;
  purposeType: string;
  taxType: string;
  supplyCostTotal: string;
  taxTotal: string;
  totalAmount: string;
  invoicerCorpNum: string;
  invoicerMgtKey: string;
  invoicerCorpName: string;
  invoicerCEOName: string;
  invoicerAddr: string;
  invoicerBizType: string;
  invoicerBizClass: string;
  invoicerContactName: string;
  invoicerTEL: string;
  invoicerEmail: string;
  invoiceeType: string;
  invoiceeCorpNum: string;
  invoiceeCorpName: string;
  invoiceeCEOName?: string;
  invoiceeBizType?: string;
  invoiceeBizClass?: string;
  invoiceeAddr: string;
  invoiceeEmail1: string;
  invoiceeTaxRegID?: string;
  invoiceeContactName1?: string;
  invoiceeContactDept1?: string;
  invoiceeContactTEL1?: string;
  invoiceeContactHP1?: string;
  invoiceeContactName2?: string;
  invoiceeContactDept2?: string;
  invoiceeContactTEL2?: string;
  invoiceeContactHP2?: string;
  invoiceeEmail2?: string;
  detailList: PopbillTaxinvoiceDetail[];
};

export function splitVatInclusive(totalAmount: number) {
  const total = Math.max(0, Math.round(totalAmount));
  const supplyCost = Math.round(total / 1.1);
  const tax = total - supplyCost;
  return { supplyCost, tax, totalAmount: total };
}

function mapPartnerTypeToPopbill(partnerType: BusinessPartnerType): string {
  if (partnerType === "business") return "사업자";
  if (partnerType === "foreigner") return "외국인";
  return "개인";
}

export function mapPartnerToPopbillBuyer(partner: BusinessPartner) {
  const corpName = partner.corp_name?.trim() || partner.display_name.trim();
  const address =
    partner.invoice_address?.trim() || partner.contact_address?.trim() || "";
  const email =
    partner.invoice_email?.trim() || partner.contact_email?.trim() || "";

  const buyer: Pick<
    PopbillTaxinvoicePayload,
    | "invoiceeType"
    | "invoiceeCorpNum"
    | "invoiceeCorpName"
    | "invoiceeCEOName"
    | "invoiceeBizType"
    | "invoiceeBizClass"
    | "invoiceeAddr"
    | "invoiceeEmail1"
    | "invoiceeTaxRegID"
    | "invoiceeContactName1"
    | "invoiceeContactDept1"
    | "invoiceeContactTEL1"
    | "invoiceeContactHP1"
    | "invoiceeContactName2"
    | "invoiceeContactDept2"
    | "invoiceeContactTEL2"
    | "invoiceeContactHP2"
    | "invoiceeEmail2"
  > = {
    invoiceeType: mapPartnerTypeToPopbill(partner.partner_type),
    invoiceeCorpNum: partner.corp_num ?? "",
    invoiceeCorpName: corpName,
    invoiceeAddr: address,
    invoiceeEmail1: email,
  };

  if (partner.invoice_tax_reg_id) {
    buyer.invoiceeTaxRegID = partner.invoice_tax_reg_id;
  }

  if (partner.partner_type === "business") {
    buyer.invoiceeCEOName = partner.ceo_name ?? "";
    buyer.invoiceeBizType = partner.biz_type ?? "";
    buyer.invoiceeBizClass = partner.biz_class ?? "";
  }

  if (partner.invoice_contact_name) {
    buyer.invoiceeContactName1 = partner.invoice_contact_name;
  }
  if (partner.invoice_contact_dept) {
    buyer.invoiceeContactDept1 = partner.invoice_contact_dept;
  }
  if (partner.invoice_contact_tel) {
    buyer.invoiceeContactTEL1 = partner.invoice_contact_tel;
  }
  if (partner.invoice_contact_hp) {
    buyer.invoiceeContactHP1 = partner.invoice_contact_hp;
  }
  if (partner.invoice_contact_name2) {
    buyer.invoiceeContactName2 = partner.invoice_contact_name2;
  }
  if (partner.invoice_contact_dept2) {
    buyer.invoiceeContactDept2 = partner.invoice_contact_dept2;
  }
  if (partner.invoice_contact_tel2) {
    buyer.invoiceeContactTEL2 = partner.invoice_contact_tel2;
  }
  if (partner.invoice_contact_hp2) {
    buyer.invoiceeContactHP2 = partner.invoice_contact_hp2;
  }
  if (partner.invoice_contact_email2) {
    buyer.invoiceeEmail2 = partner.invoice_contact_email2;
  }

  return buyer;
}

export function buildTaxInvoicePayload(input: {
  partner: BusinessPartner;
  totalAmount: number;
  itemName: string;
  writeDate?: string;
  itemPurchaseDate?: string;
  mgtKey: string;
  purposeType?: "영수" | "청구";
}): PopbillTaxinvoicePayload {
  const writeDate =
    input.writeDate ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const purchaseDT = input.itemPurchaseDate ?? writeDate;
  const { supplyCost, tax, totalAmount } = splitVatInclusive(input.totalAmount);
  const corpNum = getPopbillCorpNum();
  const supplier = getPopbillSupplierFields(corpNum);
  const buyer = mapPartnerToPopbillBuyer(input.partner);

  return {
    writeDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: input.purposeType ?? "영수",
    taxType: "과세",
    supplyCostTotal: String(supplyCost),
    taxTotal: String(tax),
    totalAmount: String(totalAmount),
    invoicerMgtKey: input.mgtKey,
    ...supplier,
    ...buyer,
    detailList: [
      {
        serialNum: 1,
        purchaseDT,
        itemName: input.itemName.trim() || "악기",
        qty: "1",
        unitCost: String(supplyCost),
        supplyCost: String(supplyCost),
        tax: String(tax),
      },
    ],
  };
}

export function buildTaxInvoiceMgtKey(saleIds: string[]) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = saleIds[0]?.replace(/-/g, "").slice(0, 8) ?? "00000000";
  return `TI-${date}-${suffix}`.slice(0, 24);
}

export async function registPopbillTaxInvoice(taxinvoice: PopbillTaxinvoicePayload) {
  const service = getPopbillTaxinvoiceService();
  const corpNum = getPopbillCorpNum();

  return promisifyPopbill<Record<string, unknown>>((success, error) => {
    service.registIssue(corpNum, taxinvoice, success, error);
  });
}

export async function resolveInvoicePartnerContext(
  supabase: SupabaseClient,
  sales: Array<{
    partner_id: string | null;
    business_partner: string | null;
  }>,
): Promise<
  | {
      partner: BusinessPartner | null;
      displayName: string;
      missing: string[];
      invoiceReady: boolean;
    }
  | { error: string }
> {
  const partnerIds = [
    ...new Set(sales.map((sale) => sale.partner_id).filter(Boolean)),
  ] as string[];

  if (partnerIds.length > 1) {
    return {
      error:
        "선택한 매출의 거래처가 서로 다릅니다. 같은 거래처의 매출만 함께 발행할 수 있습니다.",
    };
  }

  if (partnerIds.length === 1) {
    const { partner, error } = await fetchBusinessPartnerById(
      supabase,
      partnerIds[0],
    );
    if (error || !partner) {
      return { error: error ?? "거래처 정보를 찾을 수 없습니다." };
    }

    return {
      partner,
      displayName: partner.display_name,
      missing: partner.invoice_ready ? [] : missingInvoiceFields(partner),
      invoiceReady: partner.invoice_ready,
    };
  }

  const names = [
    ...new Set(
      sales
        .map((sale) => sale.business_partner?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  if (names.length === 0) {
    return {
      error: "거래처가 지정되지 않은 매출입니다. 거래처명을 입력해 주세요.",
    };
  }

  if (names.length > 1) {
    return {
      error:
        "선택한 매출의 거래처명이 서로 다릅니다. 같은 거래처의 매출만 함께 발행할 수 있습니다.",
    };
  }

  const displayName = names[0];
  const { data, error } = await supabase
    .from("business_partners")
    .select("*")
    .ilike("display_name", displayName)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: "거래처 정보를 조회하지 못했습니다." };
  }

  if (data) {
    const { partner } = await fetchBusinessPartnerById(supabase, String(data.id));
    if (!partner) {
      return { error: "거래처 정보를 찾을 수 없습니다." };
    }

    return {
      partner,
      displayName: partner.display_name,
      missing: partner.invoice_ready ? [] : missingInvoiceFields(partner),
      invoiceReady: partner.invoice_ready,
    };
  }

  const stubPartner: BusinessPartner = {
    id: "",
    partner_type: "business",
    display_name: displayName,
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    contact_address: null,
    corp_num: null,
    corp_name: null,
    ceo_name: null,
    biz_type: null,
    biz_class: null,
    invoice_address: null,
    invoice_email: null,
    invoice_tax_reg_id: null,
    invoice_contact_name: null,
    invoice_contact_dept: null,
    invoice_contact_tel: null,
    invoice_contact_hp: null,
    invoice_contact_name2: null,
    invoice_contact_dept2: null,
    invoice_contact_tel2: null,
    invoice_contact_hp2: null,
    invoice_contact_email2: null,
    memo: null,
    invoice_ready: false,
    source: "sale",
    last_used_at: null,
    created_at: "",
    updated_at: "",
  };

  return {
    partner: null,
    displayName,
    missing: missingInvoiceFields(stubPartner),
    invoiceReady: false,
  };
}

export async function resolveInvoicePartner(
  supabase: SupabaseClient,
  sales: Array<{
    partner_id: string | null;
    business_partner: string | null;
  }>,
) {
  const context = await resolveInvoicePartnerContext(supabase, sales);
  if ("error" in context) {
    return { error: context.error } as const;
  }

  if (!context.partner) {
    return {
      error:
        "거래처 마스터에 등록되지 않았습니다. 세금계산서 정보를 입력해 주세요.",
    } as const;
  }

  return { partner: context.partner } as const;
}

export function validatePartnerForIssue(partner: BusinessPartner) {
  if (!partner.invoice_ready) {
    const missing = missingInvoiceFields(partner);
    return {
      error: `세금계산서 발행 정보가 부족합니다: ${missing.join(", ")}`,
      missing,
      partnerId: partner.id,
    } as const;
  }

  return { ok: true as const };
}
