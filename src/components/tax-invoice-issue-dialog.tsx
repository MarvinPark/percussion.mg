"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getTaxInvoiceIssueContext,
  getTaxInvoicePdfUrl,
  getTaxInvoicePopbillStatus,
  issueTaxInvoiceFromSales,
  type TaxInvoiceIssueContext,
} from "@/app/(main)/sales/invoice-actions";
import PopbillStatusPanel from "@/components/popbill-status-panel";
import TaxInvoicePartnerFields, {
  createPartnerDraft,
  draftToPartnerForValidation,
  draftToPartnerInput,
  type TaxInvoicePartnerDraft,
} from "@/components/tax-invoice-partner-fields";
import TaxInvoicePreview from "@/components/tax-invoice-preview";
import TaxInvoicePreviewActions from "@/components/tax-invoice-preview-actions";
import {
  computeInvoiceReady,
  missingInvoiceFields,
} from "@/lib/business-partners";
import { formatKRW } from "@/lib/sales-calculator";
import {
  buildTaxInvoicePreviewData,
  createTaxInvoiceItemId,
} from "@/lib/tax-invoice-preview-data";
import {
  getTodayIsoDate,
  validateTaxInvoiceIsoDate,
} from "@/lib/tax-invoice-dates";
import type { PopbillIssueStatus } from "@/lib/popbill/readiness";
import type { TaxInvoiceItemDraft } from "@/types/tax-invoice";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type IssueSuccessState = {
  mgtKey: string;
  issueId: string | null;
  partnerName: string;
  saleCount: number;
  totalAmount: number;
  writeDate: string;
  itemPurchaseDate: string;
  purposeType: "영수" | "청구";
  itemNames: string[];
  recipientEmail: string;
};

type TaxInvoiceIssueDialogProps = {
  saleIds: string[];
  onClose: () => void;
  onIssued?: () => void;
};

export default function TaxInvoiceIssueDialog({
  saleIds,
  onClose,
  onIssued,
}: TaxInvoiceIssueDialogProps) {
  const [lockedSaleIds] = useState(() => [...saleIds]);
  const [items, setItems] = useState<TaxInvoiceItemDraft[]>(() => [
    { id: createTaxInvoiceItemId(), name: "악기" },
  ]);
  const [writeDate, setWriteDate] = useState(getTodayIsoDate);
  const [itemPurchaseDate, setItemPurchaseDate] = useState(getTodayIsoDate);
  const [purposeType, setPurposeType] = useState<"영수" | "청구">("영수");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [context, setContext] = useState<TaxInvoiceIssueContext | null>(null);
  const [partnerDraft, setPartnerDraft] = useState<TaxInvoicePartnerDraft | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<IssueSuccessState | null>(null);
  const [popbillStatus, setPopbillStatus] = useState<PopbillIssueStatus | null>(
    null,
  );
  const [popbillStatusError, setPopbillStatusError] = useState<string | null>(
    null,
  );
  const [isLoading, startLoad] = useTransition();
  const [isIssuing, startIssue] = useTransition();
  const maxSelectableDate = getTodayIsoDate();

  useEffect(() => {
    if (lockedSaleIds.length === 0) {
      setLoadError("발행할 매출을 선택해 주세요.");
      return;
    }

    startLoad(async () => {
      const [contextResult, statusResult] = await Promise.all([
        getTaxInvoiceIssueContext({ saleIds: lockedSaleIds }),
        getTaxInvoicePopbillStatus(),
      ]);

      if ("error" in statusResult) {
        setPopbillStatus(null);
        setPopbillStatusError(statusResult.error);
      } else {
        setPopbillStatus(statusResult);
        setPopbillStatusError(null);
      }

      if ("error" in contextResult) {
        setContext(null);
        setPartnerDraft(null);
        setLoadError(contextResult.error);
        return;
      }

      const draft = createPartnerDraft(
        contextResult.context.partner,
        contextResult.context.displayName,
      );
      setContext(contextResult.context);
      setPartnerDraft(draft);
      setRecipientEmail(draft.invoice_email);
      setLoadError(null);
    });
  }, [lockedSaleIds]);

  const draftValidation = useMemo(() => {
    if (!partnerDraft) {
      return { invoiceReady: false, missing: [] as string[] };
    }

    const partner = draftToPartnerForValidation(partnerDraft);
    const invoiceReady = computeInvoiceReady({
      partner_type: partnerDraft.partner_type,
      corp_num: partner.corp_num,
      corp_name: partner.corp_name,
      display_name: partnerDraft.displayName,
      ceo_name: partner.ceo_name,
      biz_type: partner.biz_type,
      biz_class: partner.biz_class,
      invoice_address: partner.invoice_address,
      contact_address: partner.contact_address,
      invoice_email: partner.invoice_email,
      contact_email: partner.contact_email,
    });

    return {
      invoiceReady,
      missing: invoiceReady ? [] : missingInvoiceFields(partner),
    };
  }, [partnerDraft]);

  const previewData = useMemo(() => {
    if (!context || !partnerDraft) return null;

    return buildTaxInvoicePreviewData({
      partner: draftToPartnerForValidation(partnerDraft),
      displayName: partnerDraft.displayName,
      totalAmount: context.totalAmount,
      itemNames: items.map((item) => item.name),
      writeDate,
      itemPurchaseDate,
      purposeType,
      supplierCorpNum: popbillStatus?.corpNum ?? "",
      buyerEmail: recipientEmail,
    });
  }, [
    context,
    itemPurchaseDate,
    items,
    partnerDraft,
    popbillStatus?.corpNum,
    purposeType,
    recipientEmail,
    writeDate,
  ]);

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      { id: createTaxInvoiceItemId(), name: "" },
    ]);
  }

  function handleRemoveItem(id: string) {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function handleIssue() {
    if (!context || !partnerDraft) return;

    if (popbillStatus && !popbillStatus.isTest) {
      const confirmed = window.confirm(
        "운영 환경입니다. 발행하면 국세청에 실제 신고되는 세금계산서가 발행됩니다. 계속하시겠습니까?",
      );
      if (!confirmed) return;
    }

    setIssueError(null);

    const writeDateError = validateTaxInvoiceIsoDate(writeDate);
    if (writeDateError) {
      setIssueError(`작성일자: ${writeDateError}`);
      return;
    }

    const itemDateError = validateTaxInvoiceIsoDate(itemPurchaseDate);
    if (itemDateError) {
      setIssueError(`품목일자: ${itemDateError}`);
      return;
    }

    const itemNames = items.map((item) => item.name.trim()).filter(Boolean);
    if (itemNames.length === 0) {
      setIssueError("품목명을 1개 이상 입력해 주세요.");
      return;
    }

    startIssue(async () => {
      const shouldSavePartner =
        !context.invoiceReady ||
        partnerDraft.partnerId !== context.partnerId ||
        !draftValidation.invoiceReady;

      const result = await issueTaxInvoiceFromSales({
        saleIds: lockedSaleIds,
        itemNames,
        purposeType,
        writeDate,
        itemPurchaseDate,
        recipientEmail,
        partner: shouldSavePartner
          ? {
              ...draftToPartnerInput(partnerDraft),
              partnerId: partnerDraft.partnerId,
            }
          : null,
      });

      if ("error" in result) {
        setIssueError(result.error ?? "세금계산서 발행에 실패했습니다.");
        return;
      }

      setSuccessState({
        mgtKey: result.mgtKey,
        issueId: result.issueId,
        partnerName: result.partnerName,
        saleCount: result.saleCount,
        totalAmount: result.totalAmount,
        writeDate: result.writeDate,
        itemPurchaseDate: result.itemPurchaseDate,
        purposeType: result.purposeType,
        itemNames,
        recipientEmail: result.recipientEmail ?? recipientEmail,
      });
      onIssued?.();
    });
  }

  const needsPartnerForm = context ? !draftValidation.invoiceReady : false;
  const issueButtonLabel = needsPartnerForm ? "저장 후 발행" : "발행";
  const canIssue =
    Boolean(popbillStatus?.ready) &&
    !popbillStatusError &&
    items.some((item) => item.name.trim()) &&
    Boolean(partnerDraft?.displayName.trim()) &&
    !validateTaxInvoiceIsoDate(writeDate) &&
    !validateTaxInvoiceIsoDate(itemPurchaseDate);

  const successPreview = useMemo(() => {
    if (!successState) return null;
    return buildTaxInvoicePreviewData({
      partner: partnerDraft ? draftToPartnerForValidation(partnerDraft) : null,
      displayName: successState.partnerName,
      totalAmount: successState.totalAmount,
      itemNames: successState.itemNames,
      writeDate: successState.writeDate,
      itemPurchaseDate: successState.itemPurchaseDate,
      purposeType: successState.purposeType,
      supplierCorpNum: popbillStatus?.corpNum ?? "",
      buyerEmail: successState.recipientEmail,
    });
  }, [partnerDraft, popbillStatus?.corpNum, successState]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="tax-invoice-issue-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2
              id="tax-invoice-issue-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              {successState ? "세금계산서 발행 완료" : "세금계산서 발행"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {successState
                ? `${successState.partnerName} · ${successState.saleCount}건 · ${formatKRW(successState.totalAmount)}원`
                : `선택한 매출 ${lockedSaleIds.length}건을 세금계산서로 발행합니다.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isIssuing}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            닫기
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {successState && successPreview ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <TaxInvoicePreview data={successPreview} />
              </div>
              <TaxInvoicePreviewActions
                fileBaseName={`tax-invoice-${successState.mgtKey}`}
                onPopbillPdfDownload={async () => {
                  const result = await getTaxInvoicePdfUrl({ mgtKey: successState.mgtKey });
                  if ("error" in result) return { error: result.error ?? "PDF URL을 가져오지 못했습니다." };
                  return result.url;
                }}
              />
            </div>
          ) : isLoading ? (
            <p className="text-sm text-zinc-500">불러오는 중…</p>
          ) : loadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {loadError}
            </p>
          ) : context && partnerDraft && previewData ? (
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  세금계산서 미리보기
                </p>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <TaxInvoicePreview data={previewData} />
                </div>
                <TaxInvoicePreviewActions
                  fileBaseName={`tax-invoice-preview-${lockedSaleIds[0]?.slice(0, 8) ?? "draft"}`}
                  disabled={isIssuing}
                />
              </div>

              <div className="space-y-4">
                {popbillStatus ? (
                  <PopbillStatusPanel status={popbillStatus} compact />
                ) : popbillStatusError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {popbillStatusError}
                  </p>
                ) : null}

                <dl className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-600 dark:text-zinc-400">선택 매출</dt>
                    <dd className="font-medium">{context.saleCount}건</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-600 dark:text-zinc-400">합계</dt>
                    <dd className="font-bold">{formatKRW(context.totalAmount)}원</dd>
                  </div>
                </dl>

                {needsPartnerForm || !context.invoiceReady ? (
                  <TaxInvoicePartnerFields
                    draft={partnerDraft}
                    missing={draftValidation.missing}
                    disabled={isIssuing}
                    onChange={(nextDraft) => {
                      setPartnerDraft(nextDraft);
                      if (!recipientEmail.trim()) {
                        setRecipientEmail(nextDraft.invoice_email);
                      }
                    }}
                  />
                ) : (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                    거래처{" "}
                    <span className="font-semibold">{partnerDraft.displayName}</span>
                    의 세금계산서 정보가 확인되었습니다.
                  </p>
                )}

                <div>
                  <label
                    htmlFor="tax_invoice_recipient_email"
                    className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    이메일 주소
                  </label>
                  <input
                    id="tax_invoice_recipient_email"
                    type="email"
                    value={recipientEmail}
                    onChange={(event) => setRecipientEmail(event.target.value)}
                    placeholder="거래처 세금계산서 이메일"
                    disabled={isIssuing}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    거래처에 등록된 이메일을 불러옵니다. 발행 후 Popbill로 전송합니다.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tax_invoice_write_date" className="mb-1 block text-sm font-semibold">
                      작성일자
                    </label>
                    <input
                      id="tax_invoice_write_date"
                      type="date"
                      value={writeDate}
                      max={maxSelectableDate}
                      onChange={(event) => setWriteDate(event.target.value)}
                      disabled={isIssuing}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="tax_invoice_item_purchase_date" className="mb-1 block text-sm font-semibold">
                      품목일자
                    </label>
                    <input
                      id="tax_invoice_item_purchase_date"
                      type="date"
                      value={itemPurchaseDate}
                      max={maxSelectableDate}
                      onChange={(event) => setItemPurchaseDate(event.target.value)}
                      disabled={isIssuing}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      품목
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={isIssuing}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      + 품목 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          value={item.name}
                          onChange={(event) =>
                            setItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, name: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder={index === 0 ? "악기" : "품목명"}
                          disabled={isIssuing}
                          className={inputClass}
                        />
                        {items.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isIssuing}
                            className="shrink-0 rounded border border-zinc-300 px-2 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    기본 1개 품목(악기)으로 발행되며, + 버튼으로 품목 줄을 늘릴 수 있습니다.
                  </p>
                </div>

                <div>
                  <label htmlFor="tax_invoice_purpose" className="mb-1 block text-sm font-semibold">
                    영수/청구
                  </label>
                  <select
                    id="tax_invoice_purpose"
                    value={purposeType}
                    onChange={(event) =>
                      setPurposeType(event.target.value as "영수" | "청구")
                    }
                    disabled={isIssuing}
                    className={inputClass}
                  >
                    <option value="영수">영수</option>
                    <option value="청구">청구</option>
                  </select>
                </div>

                {issueError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {issueError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isIssuing}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleIssue}
                    disabled={isIssuing || !canIssue}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    {isIssuing ? "처리 중…" : issueButtonLabel}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
