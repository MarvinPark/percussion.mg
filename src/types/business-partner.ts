export type BusinessPartnerType = "business" | "individual" | "foreigner";

export type BusinessPartnerSource = "manual" | "quote" | "sale";

export type BusinessPartner = {
  id: string;
  partner_type: BusinessPartnerType;
  display_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  corp_num: string | null;
  corp_name: string | null;
  ceo_name: string | null;
  biz_type: string | null;
  biz_class: string | null;
  invoice_address: string | null;
  invoice_email: string | null;
  invoice_tax_reg_id: string | null;
  invoice_contact_name: string | null;
  invoice_contact_dept: string | null;
  invoice_contact_tel: string | null;
  invoice_contact_hp: string | null;
  invoice_contact_name2: string | null;
  invoice_contact_dept2: string | null;
  invoice_contact_tel2: string | null;
  invoice_contact_hp2: string | null;
  invoice_contact_email2: string | null;
  memo: string | null;
  invoice_ready: boolean;
  source: BusinessPartnerSource;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessPartnerInput = {
  partner_type: BusinessPartnerType;
  display_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_address?: string;
  corp_num?: string;
  corp_name?: string;
  ceo_name?: string;
  biz_type?: string;
  biz_class?: string;
  invoice_address?: string;
  invoice_email?: string;
  invoice_tax_reg_id?: string;
  invoice_contact_name?: string;
  invoice_contact_dept?: string;
  invoice_contact_tel?: string;
  invoice_contact_hp?: string;
  invoice_contact_name2?: string;
  invoice_contact_dept2?: string;
  invoice_contact_tel2?: string;
  invoice_contact_hp2?: string;
  invoice_contact_email2?: string;
  memo?: string;
};

export const PARTNER_TYPE_LABELS: Record<BusinessPartnerType, string> = {
  business: "사업자",
  individual: "개인",
  foreigner: "외국인",
};

export const PARTNER_SOURCE_LABELS: Record<BusinessPartnerSource, string> = {
  manual: "직접 등록",
  quote: "견적",
  sale: "매출",
};

export const REG_NUM_LABELS: Record<BusinessPartnerType, string> = {
  business: "사업자등록번호",
  individual: "주민등록번호",
  foreigner: "등록번호",
};

export const REG_NUM_PLACEHOLDERS: Record<BusinessPartnerType, string> = {
  business: "000-00-00000 (10자리)",
  individual: "주민등록번호 13자리 ('-' 제외)",
  foreigner: "9999999999999 (외국인 고정값 가능)",
};
