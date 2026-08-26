"use client";

import BusinessPartnerAutocomplete from "@/components/business-partner-autocomplete";
import type { BusinessPartnerSuggestion } from "@/lib/business-partners";
import type { BusinessPartner, BusinessPartnerType } from "@/types/business-partner";
import {
  PARTNER_TYPE_LABELS,
  REG_NUM_LABELS,
  REG_NUM_PLACEHOLDERS,
} from "@/types/business-partner";
import { FOREIGNER_REG_NUM } from "@/lib/business-partners";

export type TaxInvoicePartnerDraft = {
  partnerId: string | null;
  displayName: string;
  partner_type: BusinessPartnerType;
  corp_num: string;
  corp_name: string;
  ceo_name: string;
  biz_type: string;
  biz_class: string;
  invoice_address: string;
  invoice_email: string;
  invoice_tax_reg_id: string;
};

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const missingFieldClass =
  "border-amber-400 ring-1 ring-amber-300 dark:border-amber-600 dark:ring-amber-800";

function isMissing(missing: string[], labels: string[]) {
  return labels.some((label) => missing.includes(label));
}

export function createPartnerDraft(
  partner: BusinessPartner | null,
  displayName: string,
): TaxInvoicePartnerDraft {
  return {
    partnerId: partner?.id ?? null,
    displayName: partner?.display_name ?? displayName,
    partner_type: partner?.partner_type ?? "business",
    corp_num: partner?.corp_num ?? "",
    corp_name: partner?.corp_name ?? "",
    ceo_name: partner?.ceo_name ?? "",
    biz_type: partner?.biz_type ?? "",
    biz_class: partner?.biz_class ?? "",
    invoice_address: partner?.invoice_address ?? partner?.contact_address ?? "",
    invoice_email: partner?.invoice_email ?? partner?.contact_email ?? "",
    invoice_tax_reg_id: partner?.invoice_tax_reg_id ?? "",
  };
}

export function createPartnerDraftFromSuggestion(
  partner: BusinessPartnerSuggestion,
): TaxInvoicePartnerDraft {
  return {
    partnerId: partner.id,
    displayName: partner.display_name,
    partner_type: partner.partner_type,
    corp_num: partner.corp_num ?? "",
    corp_name: partner.corp_name ?? "",
    ceo_name: partner.ceo_name ?? "",
    biz_type: partner.biz_type ?? "",
    biz_class: partner.biz_class ?? "",
    invoice_address: partner.invoice_address ?? partner.contact_address ?? "",
    invoice_email: partner.invoice_email ?? partner.contact_email ?? "",
    invoice_tax_reg_id: partner.invoice_tax_reg_id ?? "",
  };
}

export function draftToPartnerForValidation(
  draft: TaxInvoicePartnerDraft,
): BusinessPartner {
  return {
    id: draft.partnerId ?? "",
    partner_type: draft.partner_type,
    display_name: draft.displayName,
    contact_name: null,
    contact_phone: null,
    contact_email: draft.invoice_email || null,
    contact_address: draft.invoice_address || null,
    corp_num: draft.corp_num || null,
    corp_name: draft.corp_name || null,
    ceo_name: draft.ceo_name || null,
    biz_type: draft.biz_type || null,
    biz_class: draft.biz_class || null,
    invoice_address: draft.invoice_address || null,
    invoice_email: draft.invoice_email || null,
    invoice_tax_reg_id: draft.invoice_tax_reg_id || null,
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
    source: "manual",
    last_used_at: null,
    created_at: "",
    updated_at: "",
  };
}

type TaxInvoicePartnerFieldsProps = {
  draft: TaxInvoicePartnerDraft;
  missing: string[];
  disabled?: boolean;
  onChange: (draft: TaxInvoicePartnerDraft) => void;
};

export default function TaxInvoicePartnerFields({
  draft,
  missing,
  disabled = false,
  onChange,
}: TaxInvoicePartnerFieldsProps) {
  function patch(fields: Partial<TaxInvoicePartnerDraft>) {
    onChange({ ...draft, ...fields });
  }

  const isBusiness = draft.partner_type === "business";

  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          공급받는자 정보
        </h3>
        <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
          {missing.length > 0
            ? `아래 항목을 입력하면 발행할 수 있습니다: ${missing.join(", ")}`
            : "정보가 모두 입력되었습니다."}
        </p>
      </div>

      <div>
        <label htmlFor="ti_display_name" className={labelClass}>
          거래처명
        </label>
        <BusinessPartnerAutocomplete
          id="ti_display_name"
          name="display_name"
          value={draft.displayName}
          partnerId={draft.partnerId ?? ""}
          onChange={(displayName) =>
            patch({
              displayName,
              partnerId: null,
            })
          }
          onPartnerIdChange={(partnerId) =>
            patch({ partnerId: partnerId || null })
          }
          onSelectPartner={(partner) =>
            onChange(createPartnerDraftFromSuggestion(partner))
          }
          disabled={disabled}
          placeholder="거래처명, 메모, 대표자명으로 검색"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ti_partner_type" className={labelClass}>
            구분
          </label>
          <select
            id="ti_partner_type"
            value={draft.partner_type}
            onChange={(event) =>
              patch({ partner_type: event.target.value as BusinessPartnerType })
            }
            disabled={disabled}
            className={inputClass}
          >
            {Object.entries(PARTNER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ti_corp_num" className={labelClass}>
            {REG_NUM_LABELS[draft.partner_type]}
          </label>
          <div className="flex gap-2">
            <input
              id="ti_corp_num"
              value={draft.corp_num}
              onChange={(event) => patch({ corp_num: event.target.value })}
              disabled={disabled}
              placeholder={REG_NUM_PLACEHOLDERS[draft.partner_type]}
              className={`${inputClass} ${
                isMissing(missing, [
                  "사업자등록번호",
                  "주민등록번호",
                  "외국인 등록번호",
                ])
                  ? missingFieldClass
                  : ""
              }`}
            />
            {draft.partner_type === "foreigner" ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => patch({ corp_num: FOREIGNER_REG_NUM })}
                className="shrink-0 rounded-lg border border-zinc-300 px-2 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
              >
                기본값
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="ti_corp_name" className={labelClass}>
            상호
          </label>
          <input
            id="ti_corp_name"
            value={draft.corp_name}
            onChange={(event) => patch({ corp_name: event.target.value })}
            disabled={disabled}
            placeholder="비우면 거래처명 사용"
            className={`${inputClass} ${
              isMissing(missing, ["상호"]) ? missingFieldClass : ""
            }`}
          />
        </div>

        {isBusiness ? (
          <div>
            <label htmlFor="ti_ceo_name" className={labelClass}>
              대표자 성명
            </label>
            <input
              id="ti_ceo_name"
              value={draft.ceo_name}
              onChange={(event) => patch({ ceo_name: event.target.value })}
              disabled={disabled}
              className={`${inputClass} ${
                isMissing(missing, ["대표자"]) ? missingFieldClass : ""
              }`}
            />
          </div>
        ) : null}

        {isBusiness ? (
          <>
            <div>
              <label htmlFor="ti_biz_type" className={labelClass}>
                업태
              </label>
              <input
                id="ti_biz_type"
                value={draft.biz_type}
                onChange={(event) => patch({ biz_type: event.target.value })}
                disabled={disabled}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ti_biz_class" className={labelClass}>
                종목
              </label>
              <input
                id="ti_biz_class"
                value={draft.biz_class}
                onChange={(event) => patch({ biz_class: event.target.value })}
                disabled={disabled}
                className={inputClass}
              />
            </div>
          </>
        ) : null}

        <div className="sm:col-span-2">
          <label htmlFor="ti_invoice_address" className={labelClass}>
            주소
          </label>
          <input
            id="ti_invoice_address"
            value={draft.invoice_address}
            onChange={(event) => patch({ invoice_address: event.target.value })}
            disabled={disabled}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ti_invoice_email" className={labelClass}>
            이메일
          </label>
          <input
            id="ti_invoice_email"
            type="email"
            value={draft.invoice_email}
            onChange={(event) => patch({ invoice_email: event.target.value })}
            disabled={disabled}
            className={`${inputClass} ${
              isMissing(missing, ["이메일"]) ? missingFieldClass : ""
            }`}
          />
        </div>
      </div>
    </section>
  );
}

export function draftToPartnerInput(draft: TaxInvoicePartnerDraft) {
  return {
    partner_type: draft.partner_type,
    display_name: draft.displayName.trim(),
    corp_num: draft.corp_num.trim() || undefined,
    corp_name: draft.corp_name.trim() || undefined,
    ceo_name: draft.ceo_name.trim() || undefined,
    biz_type: draft.biz_type.trim() || undefined,
    biz_class: draft.biz_class.trim() || undefined,
    invoice_address: draft.invoice_address.trim() || undefined,
    invoice_email: draft.invoice_email.trim() || undefined,
    invoice_tax_reg_id: draft.invoice_tax_reg_id.trim() || undefined,
  };
}
