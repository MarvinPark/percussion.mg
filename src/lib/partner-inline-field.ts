import { formatRegNum } from "@/lib/business-partners";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import type { PartnersTableColumnId } from "@/lib/partners-table-columns";
import type { BusinessPartner } from "@/types/business-partner";

export type PartnerInlineField = Exclude<PartnersTableColumnId, "actions">;

export function getPartnerInlineDisplayValue(
  partner: BusinessPartner,
  field: PartnerInlineField,
): string {
  switch (field) {
    case "display_name":
      return partner.corp_name || partner.display_name;
    case "corp_num":
      return formatRegNum(partner.corp_num, partner.partner_type);
    case "ceo_name":
      return partner.ceo_name || "";
    case "phone":
      return formatPhoneForDisplay(partner.contact_phone) || "";
    case "email":
      return partner.invoice_email || partner.contact_email || "";
    case "address":
      return partner.invoice_address || partner.contact_address || "";
    case "biz_type":
      return partner.biz_type || "";
    case "biz_class":
      return partner.biz_class || "";
    case "memo":
      return partner.memo || "";
    default:
      return "";
  }
}

export function getPartnerInlineEditValue(
  partner: BusinessPartner,
  field: PartnerInlineField,
): string {
  switch (field) {
    case "display_name":
      return partner.corp_name || partner.display_name;
    case "corp_num":
      return partner.corp_num || "";
    case "ceo_name":
      return partner.ceo_name || "";
    case "phone":
      return partner.contact_phone || "";
    case "email":
      return partner.invoice_email || partner.contact_email || "";
    case "address":
      return partner.invoice_address || partner.contact_address || "";
    case "biz_type":
      return partner.biz_type || "";
    case "biz_class":
      return partner.biz_class || "";
    case "memo":
      return partner.memo || "";
    default:
      return "";
  }
}

export function applyPartnerInlineFieldUpdate(
  partner: BusinessPartner,
  field: PartnerInlineField,
  value: string | null,
): BusinessPartner {
  const normalized = value?.trim() || null;

  switch (field) {
    case "display_name":
      if (partner.corp_name) {
        return { ...partner, corp_name: normalized ?? partner.display_name };
      }
      return { ...partner, display_name: normalized ?? "" };
    case "corp_num":
      return { ...partner, corp_num: normalized };
    case "ceo_name":
      return { ...partner, ceo_name: normalized };
    case "phone":
      return { ...partner, contact_phone: normalized };
    case "email":
      if (partner.invoice_email) {
        return { ...partner, invoice_email: normalized };
      }
      return { ...partner, contact_email: normalized };
    case "address":
      if (partner.invoice_address) {
        return { ...partner, invoice_address: normalized };
      }
      return { ...partner, contact_address: normalized };
    case "biz_type":
      return { ...partner, biz_type: normalized };
    case "biz_class":
      return { ...partner, biz_class: normalized };
    case "memo":
      return { ...partner, memo: normalized };
    default:
      return partner;
  }
}
