"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  createBusinessPartner,
  deleteBusinessPartner,
  updateBusinessPartner,
} from "@/app/(main)/partners/actions";
import PhoneInput from "@/components/phone-input";
import {
  computeInvoiceReady,
  missingInvoiceFields,
  FOREIGNER_REG_NUM,
} from "@/lib/business-partners";
import type { BusinessPartner, BusinessPartnerType } from "@/types/business-partner";
import {
  PARTNER_TYPE_LABELS,
  REG_NUM_LABELS,
  REG_NUM_PLACEHOLDERS,
} from "@/types/business-partner";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const sectionTitleClass =
  "text-sm font-bold text-zinc-900 dark:text-zinc-100";

const subsectionClass =
  "space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/40";

type BusinessPartnerFormProps = {
  partner?: BusinessPartner;
  canManage?: boolean;
};

export default function BusinessPartnerForm({
  partner,
  canManage = true,
}: BusinessPartnerFormProps) {
  const router = useRouter();
  const [isDeleting, startDelete] = useTransition();
  const isEditing = Boolean(partner);

  const [partnerType, setPartnerType] = useState<BusinessPartnerType>(
    partner?.partner_type ?? "individual",
  );
  const [displayName, setDisplayName] = useState(partner?.display_name ?? "");
  const [contactName, setContactName] = useState(partner?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(partner?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(partner?.contact_email ?? "");
  const [contactAddress, setContactAddress] = useState(
    partner?.contact_address ?? "",
  );
  const [memo, setMemo] = useState(partner?.memo ?? "");
  const [corpNum, setCorpNum] = useState(partner?.corp_num ?? "");
  const [corpName, setCorpName] = useState(partner?.corp_name ?? "");
  const [ceoName, setCeoName] = useState(partner?.ceo_name ?? "");
  const [bizType, setBizType] = useState(partner?.biz_type ?? "");
  const [bizClass, setBizClass] = useState(partner?.biz_class ?? "");
  const [invoiceAddress, setInvoiceAddress] = useState(
    partner?.invoice_address ?? "",
  );
  const [invoiceEmail, setInvoiceEmail] = useState(partner?.invoice_email ?? "");
  const [invoiceTaxRegId, setInvoiceTaxRegId] = useState(
    partner?.invoice_tax_reg_id ?? "",
  );
  const [invoiceContactName, setInvoiceContactName] = useState(
    partner?.invoice_contact_name ?? "",
  );
  const [invoiceContactDept, setInvoiceContactDept] = useState(
    partner?.invoice_contact_dept ?? "",
  );
  const [invoiceContactTel, setInvoiceContactTel] = useState(
    partner?.invoice_contact_tel ?? "",
  );
  const [invoiceContactHp, setInvoiceContactHp] = useState(
    partner?.invoice_contact_hp ?? "",
  );
  const [invoiceContactName2, setInvoiceContactName2] = useState(
    partner?.invoice_contact_name2 ?? "",
  );
  const [invoiceContactDept2, setInvoiceContactDept2] = useState(
    partner?.invoice_contact_dept2 ?? "",
  );
  const [invoiceContactTel2, setInvoiceContactTel2] = useState(
    partner?.invoice_contact_tel2 ?? "",
  );
  const [invoiceContactHp2, setInvoiceContactHp2] = useState(
    partner?.invoice_contact_hp2 ?? "",
  );
  const [invoiceContactEmail2, setInvoiceContactEmail2] = useState(
    partner?.invoice_contact_email2 ?? "",
  );

  const normalizedRegNum = useMemo(() => {
    const digits = corpNum.replace(/\D/g, "");
    if (partnerType === "business") {
      return digits.length === 10 ? digits : null;
    }
    if (partnerType === "individual" || partnerType === "foreigner") {
      return digits.length === 13 ? digits : null;
    }
    return null;
  }, [corpNum, partnerType]);

  const invoiceReadyPreview = computeInvoiceReady({
    partner_type: partnerType,
    corp_num: normalizedRegNum,
    corp_name: corpName.trim() || null,
    display_name: displayName.trim(),
    ceo_name: ceoName.trim() || null,
    biz_type: bizType.trim() || null,
    biz_class: bizClass.trim() || null,
    invoice_address: invoiceAddress.trim() || null,
    contact_address: contactAddress.trim() || null,
    invoice_email: invoiceEmail.trim() || null,
    contact_email: contactEmail.trim() || null,
  });

  const missingFields = useMemo(() => {
    if (invoiceReadyPreview) return [];
    return missingInvoiceFields({
      ...(partner ?? {
        id: "",
        partner_type: partnerType,
        display_name: displayName,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        contact_address: contactAddress || null,
        corp_num: normalizedRegNum,
        corp_name: corpName || null,
        ceo_name: ceoName || null,
        biz_type: bizType || null,
        biz_class: bizClass || null,
        invoice_address: invoiceAddress || null,
        invoice_email: invoiceEmail || null,
        invoice_tax_reg_id: invoiceTaxRegId || null,
        invoice_contact_name: invoiceContactName || null,
        invoice_contact_dept: invoiceContactDept || null,
        invoice_contact_tel: invoiceContactTel || null,
        invoice_contact_hp: invoiceContactHp || null,
        invoice_contact_name2: invoiceContactName2 || null,
        invoice_contact_dept2: invoiceContactDept2 || null,
        invoice_contact_tel2: invoiceContactTel2 || null,
        invoice_contact_hp2: invoiceContactHp2 || null,
        invoice_contact_email2: invoiceContactEmail2 || null,
        memo: memo || null,
        invoice_ready: false,
        source: "manual",
        last_used_at: null,
        created_at: "",
        updated_at: "",
      }),
      partner_type: partnerType,
      display_name: displayName,
      corp_num: normalizedRegNum,
      corp_name: corpName || null,
      ceo_name: ceoName || null,
      biz_type: bizType || null,
      biz_class: bizClass || null,
      invoice_address: invoiceAddress || null,
      contact_address: contactAddress || null,
      invoice_email: invoiceEmail || null,
      contact_email: contactEmail || null,
    });
  }, [
    invoiceReadyPreview,
    partner,
    partnerType,
    displayName,
    contactName,
    contactPhone,
    contactEmail,
    contactAddress,
    normalizedRegNum,
    corpName,
    ceoName,
    bizType,
    bizClass,
    invoiceAddress,
    invoiceEmail,
    invoiceTaxRegId,
    invoiceContactName,
    invoiceContactDept,
    invoiceContactTel,
    invoiceContactHp,
    invoiceContactName2,
    invoiceContactDept2,
    invoiceContactTel2,
    invoiceContactHp2,
    invoiceContactEmail2,
  ]);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      if (isEditing) {
        return (await updateBusinessPartner(formData)) ?? null;
      }
      return (await createBusinessPartner(formData)) ?? null;
    },
    null,
  );

  function applyForeignerDefault() {
    setPartnerType("foreigner");
    setCorpNum(FOREIGNER_REG_NUM);
  }

  function copyBasicToInvoiceContact() {
    if (!invoiceContactName.trim() && contactName.trim()) {
      setInvoiceContactName(contactName);
    }
    if (!invoiceContactTel.trim() && contactPhone.trim()) {
      setInvoiceContactTel(contactPhone);
    }
    if (!invoiceEmail.trim() && contactEmail.trim()) {
      setInvoiceEmail(contactEmail);
    }
    if (!invoiceAddress.trim() && contactAddress.trim()) {
      setInvoiceAddress(contactAddress);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          invoiceReadyPreview
            ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
            : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        }`}
      >
        {invoiceReadyPreview ? (
          "세금계산서 발행에 필요한 공급받는자 정보가 모두 입력되었습니다."
        ) : (
          <>
            <p>아직 부족한 항목: {missingFields.join(", ")}</p>
            <p className="mt-1 text-xs opacity-90">
              사업자는 등록번호·상호·대표자·이메일만 있으면 발행 가능합니다.
              개인은 주민등록번호·상호(성명)·이메일이 필요합니다.
            </p>
          </>
        )}
      </div>

      <form action={formAction} className="space-y-6">
        {isEditing ? (
          <input type="hidden" name="partner_id" value={partner!.id} />
        ) : null}

        <section className="space-y-4">
          <h3 className={sectionTitleClass}>거래처 기본 (견적·매출용)</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            일상적인 견적·매출 작성에 쓰는 연락처입니다. 세금계산서 정보와
            다를 수 있습니다.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="display_name" className={labelClass}>
                거래처 표시명 <span className="text-red-500">*</span>
              </label>
              <input
                id="display_name"
                name="display_name"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={!canManage || isPending}
                placeholder="예: OO학교, 홍길동"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact_name" className={labelClass}>
                담당자명
              </label>
              <input
                id="contact_name"
                name="contact_name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                disabled={!canManage || isPending}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact_phone" className={labelClass}>
                연락처
              </label>
              <PhoneInput
                id="contact_phone"
                name="contact_phone"
                value={contactPhone}
                onChange={setContactPhone}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact_email" className={labelClass}>
                이메일
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                disabled={!canManage || isPending}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact_address" className={labelClass}>
                주소
              </label>
              <input
                id="contact_address"
                name="contact_address"
                value={contactAddress}
                onChange={(event) => setContactAddress(event.target.value)}
                disabled={!canManage || isPending}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="memo" className={labelClass}>
                메모
              </label>
              <textarea
                id="memo"
                name="memo"
                rows={3}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                disabled={!canManage || isPending}
                placeholder="거래처 관련 메모"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className={sectionTitleClass}>
                세금계산서 · 공급받는자 정보
              </h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                팝빌 전자세금계산서 발행 시 사용합니다. B2C 개인도 주민등록번호로
                발행할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={copyBasicToInvoiceContact}
              disabled={!canManage || isPending}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              기본 연락처 복사
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="partner_type" className={labelClass}>
                공급받는자 구분
              </label>
              <select
                id="partner_type"
                name="partner_type"
                value={partnerType}
                onChange={(event) =>
                  setPartnerType(event.target.value as BusinessPartnerType)
                }
                disabled={!canManage || isPending}
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
              <label htmlFor="corp_num" className={labelClass}>
                {REG_NUM_LABELS[partnerType]}
              </label>
              <div className="flex gap-2">
                <input
                  id="corp_num"
                  name="corp_num"
                  value={corpNum}
                  onChange={(event) => setCorpNum(event.target.value)}
                  disabled={!canManage || isPending}
                  placeholder={REG_NUM_PLACEHOLDERS[partnerType]}
                  className={inputClass}
                />
                {partnerType === "foreigner" ? (
                  <button
                    type="button"
                    onClick={applyForeignerDefault}
                    disabled={!canManage || isPending}
                    className="shrink-0 rounded-lg border border-zinc-300 px-2 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                  >
                    외국인 기본값
                  </button>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="invoice_tax_reg_id" className={labelClass}>
                종사업장번호
              </label>
              <input
                id="invoice_tax_reg_id"
                name="invoice_tax_reg_id"
                value={invoiceTaxRegId}
                onChange={(event) => setInvoiceTaxRegId(event.target.value)}
                disabled={!canManage || isPending}
                placeholder="4자리 (해당 시)"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="corp_name" className={labelClass}>
                상호 (공급받는자)
              </label>
              <input
                id="corp_name"
                name="corp_name"
                value={corpName}
                onChange={(event) => setCorpName(event.target.value)}
                disabled={!canManage || isPending}
                placeholder="비우면 거래처 표시명 사용"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ceo_name" className={labelClass}>
                대표자 성명
              </label>
              <input
                id="ceo_name"
                name="ceo_name"
                value={ceoName}
                onChange={(event) => setCeoName(event.target.value)}
                disabled={!canManage || isPending}
                placeholder={partnerType === "individual" ? "개인은 성명과 동일 가능" : ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="biz_type" className={labelClass}>
                업태
              </label>
              <input
                id="biz_type"
                name="biz_type"
                value={bizType}
                onChange={(event) => setBizType(event.target.value)}
                disabled={!canManage || isPending}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="biz_class" className={labelClass}>
                종목
              </label>
              <input
                id="biz_class"
                name="biz_class"
                value={bizClass}
                onChange={(event) => setBizClass(event.target.value)}
                disabled={!canManage || isPending}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="invoice_address" className={labelClass}>
                주소 (공급받는자)
              </label>
              <input
                id="invoice_address"
                name="invoice_address"
                value={invoiceAddress}
                onChange={(event) => setInvoiceAddress(event.target.value)}
                disabled={!canManage || isPending}
                placeholder="비우면 기본 주소 사용"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="invoice_email" className={labelClass}>
                이메일 (발행 안내)
              </label>
              <input
                id="invoice_email"
                name="invoice_email"
                type="email"
                value={invoiceEmail}
                onChange={(event) => setInvoiceEmail(event.target.value)}
                disabled={!canManage || isPending}
                placeholder="비우면 기본 이메일 사용"
                className={inputClass}
              />
            </div>
          </div>

          <div className={subsectionClass}>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              담당자 1 (invoiceeContactName1)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="invoice_contact_name" className={labelClass}>
                  담당자 성명
                </label>
                <input
                  id="invoice_contact_name"
                  name="invoice_contact_name"
                  value={invoiceContactName}
                  onChange={(event) => setInvoiceContactName(event.target.value)}
                  disabled={!canManage || isPending}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="invoice_contact_dept" className={labelClass}>
                  부서
                </label>
                <input
                  id="invoice_contact_dept"
                  name="invoice_contact_dept"
                  value={invoiceContactDept}
                  onChange={(event) => setInvoiceContactDept(event.target.value)}
                  disabled={!canManage || isPending}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="invoice_contact_tel" className={labelClass}>
                  연락처
                </label>
                <PhoneInput
                  id="invoice_contact_tel"
                  name="invoice_contact_tel"
                  value={invoiceContactTel}
                  onChange={setInvoiceContactTel}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="invoice_contact_hp" className={labelClass}>
                  휴대폰
                </label>
                <PhoneInput
                  id="invoice_contact_hp"
                  name="invoice_contact_hp"
                  value={invoiceContactHp}
                  onChange={setInvoiceContactHp}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className={subsectionClass}>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              담당자 2 (선택, invoiceeContactName2)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="invoice_contact_name2" className={labelClass}>
                  담당자 성명
                </label>
                <input
                  id="invoice_contact_name2"
                  name="invoice_contact_name2"
                  value={invoiceContactName2}
                  onChange={(event) => setInvoiceContactName2(event.target.value)}
                  disabled={!canManage || isPending}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="invoice_contact_dept2" className={labelClass}>
                  부서
                </label>
                <input
                  id="invoice_contact_dept2"
                  name="invoice_contact_dept2"
                  value={invoiceContactDept2}
                  onChange={(event) => setInvoiceContactDept2(event.target.value)}
                  disabled={!canManage || isPending}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="invoice_contact_tel2" className={labelClass}>
                  연락처
                </label>
                <PhoneInput
                  id="invoice_contact_tel2"
                  name="invoice_contact_tel2"
                  value={invoiceContactTel2}
                  onChange={setInvoiceContactTel2}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="invoice_contact_hp2" className={labelClass}>
                  휴대폰
                </label>
                <PhoneInput
                  id="invoice_contact_hp2"
                  name="invoice_contact_hp2"
                  value={invoiceContactHp2}
                  onChange={setInvoiceContactHp2}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="invoice_contact_email2" className={labelClass}>
                  이메일
                </label>
                <input
                  id="invoice_contact_email2"
                  name="invoice_contact_email2"
                  type="email"
                  value={invoiceContactEmail2}
                  onChange={(event) => setInvoiceContactEmail2(event.target.value)}
                  disabled={!canManage || isPending}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>

        {state?.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        ) : null}

        {state && "success" in state && state.success ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            저장되었습니다.
          </p>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              {isPending ? "저장 중..." : isEditing ? "수정 저장" : "거래처 등록"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/partners")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              목록
            </button>
          </div>
        ) : null}
      </form>

      {isEditing && canManage ? (
        <button
          type="button"
          disabled={isDeleting || isPending}
          onClick={() => {
            if (
              !confirm(
                "이 거래처를 삭제할까요? 연결된 견적·매출의 partner_id는 해제됩니다.",
              )
            ) {
              return;
            }

            const formData = new FormData();
            formData.set("partner_id", partner!.id);
            startDelete(() => {
              void deleteBusinessPartner(formData);
            });
          }}
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
        >
          {isDeleting ? "삭제 중..." : "거래처 삭제"}
        </button>
      ) : null}
    </div>
  );
}
