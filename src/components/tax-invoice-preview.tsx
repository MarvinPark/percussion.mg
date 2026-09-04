"use client";

import { forwardRef } from "react";
import { formatKRW } from "@/lib/sales-calculator";
import type { TaxInvoicePreviewData } from "@/lib/tax-invoice-preview-data";

type TaxInvoicePreviewProps = {
  data: TaxInvoicePreviewData;
  className?: string;
};

const cellClass = "border border-zinc-400 px-1.5 py-1 text-[11px] leading-tight";
const labelClass = "bg-zinc-100 px-1.5 py-1 text-[10px] font-semibold text-zinc-700";

function PartyBlock({
  title,
  party,
}: {
  title: string;
  party: TaxInvoicePreviewData["supplier"];
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="border border-zinc-500 bg-zinc-100 px-2 py-1 text-center text-xs font-bold text-zinc-800">
        {title}
      </div>
      <table className="w-full border-collapse text-left">
        <tbody>
          <tr>
            <td className={`${labelClass} w-16 border border-zinc-400`}>등록번호</td>
            <td className={`${cellClass} font-medium`} colSpan={3}>
              {party.corpNum}
            </td>
          </tr>
          <tr>
            <td className={`${labelClass} border border-zinc-400`}>상호</td>
            <td className={cellClass}>{party.corpName}</td>
            <td className={`${labelClass} w-14 border border-zinc-400`}>성명</td>
            <td className={cellClass}>{party.ceoName}</td>
          </tr>
          <tr>
            <td className={`${labelClass} border border-zinc-400`}>사업장</td>
            <td className={cellClass} colSpan={3}>
              {party.address}
            </td>
          </tr>
          <tr>
            <td className={`${labelClass} border border-zinc-400`}>업태</td>
            <td className={cellClass}>{party.bizType}</td>
            <td className={`${labelClass} border border-zinc-400`}>종목</td>
            <td className={cellClass}>{party.bizClass}</td>
          </tr>
          <tr>
            <td className={`${labelClass} border border-zinc-400`}>담당</td>
            <td className={cellClass}>{party.contactName}</td>
            <td className={`${labelClass} border border-zinc-400`}>연락처</td>
            <td className={cellClass}>{party.tel}</td>
          </tr>
          <tr>
            <td className={`${labelClass} border border-zinc-400`}>이메일</td>
            <td className={cellClass} colSpan={3}>
              {party.email}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const TaxInvoicePreview = forwardRef<HTMLDivElement, TaxInvoicePreviewProps>(
  function TaxInvoicePreview({ data, className = "" }, ref) {
    const paddedItems = [...data.items];
    while (paddedItems.length < 4) {
      paddedItems.push({
        monthDay: "",
        name: "",
        spec: "",
        qty: "",
        unitCost: 0,
        supplyCost: 0,
        tax: 0,
        remark: "",
      });
    }

    return (
      <div
        ref={ref}
        className={`tax-invoice-preview mx-auto w-full max-w-[760px] bg-white p-4 text-zinc-900 ${className}`}
      >
        <div className="mb-4 overflow-hidden rounded-sm border border-zinc-500">
          <div className="border-b border-zinc-500 bg-zinc-50 px-3 py-3 text-center">
            <h3 className="text-lg font-bold leading-none text-zinc-900">
              전자세금계산서
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2 text-xs leading-normal text-zinc-800">
            <div className="flex shrink-0 items-center gap-4 whitespace-nowrap">
              <span>({data.purposeType === "영수" ? "✓" : " "}) 영수</span>
              <span>({data.purposeType === "청구" ? "✓" : " "}) 청구</span>
            </div>
            <p className="shrink-0 whitespace-nowrap text-zinc-700">
              작성일자: {data.writeDateLabel}
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-3 md:flex-row">
          <PartyBlock title="공급자" party={data.supplier} />
          <PartyBlock title="공급받는자" party={data.buyer} />
        </div>

        <table className="mb-3 w-full border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-[10px] font-semibold text-zinc-700">
              <th className={`${cellClass} w-12`}>월일</th>
              <th className={cellClass}>품목</th>
              <th className={`${cellClass} w-16`}>규격</th>
              <th className={`${cellClass} w-10`}>수량</th>
              <th className={`${cellClass} w-20 text-right`}>단가</th>
              <th className={`${cellClass} w-24 text-right`}>공급가액</th>
              <th className={`${cellClass} w-20 text-right`}>세액</th>
              <th className={cellClass}>비고</th>
            </tr>
          </thead>
          <tbody>
            {paddedItems.slice(0, 8).map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td className={`${cellClass} text-center`}>{item.monthDay}</td>
                <td className={cellClass}>{item.name}</td>
                <td className={cellClass}>{item.spec}</td>
                <td className={`${cellClass} text-center`}>{item.qty}</td>
                <td className={`${cellClass} text-right tabular-nums`}>
                  {item.unitCost ? formatKRW(item.unitCost) : ""}
                </td>
                <td className={`${cellClass} text-right tabular-nums`}>
                  {item.supplyCost ? formatKRW(item.supplyCost) : ""}
                </td>
                <td className={`${cellClass} text-right tabular-nums`}>
                  {item.tax ? formatKRW(item.tax) : ""}
                </td>
                <td className={cellClass}>{item.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div className={`${cellClass} bg-zinc-50`}>
            <span className="text-xs text-zinc-500">공급가액</span>
            <p className="font-semibold tabular-nums">{formatKRW(data.supplyCostTotal)}원</p>
          </div>
          <div className={`${cellClass} bg-zinc-50`}>
            <span className="text-xs text-zinc-500">세액</span>
            <p className="font-semibold tabular-nums">{formatKRW(data.taxTotal)}원</p>
          </div>
          <div className={`${cellClass} bg-zinc-50 md:col-span-2`}>
            <span className="text-xs text-zinc-500">합계 (VAT 포함)</span>
            <p className="text-base font-bold tabular-nums">{formatKRW(data.totalAmount)}원</p>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-zinc-500">
          품목일자: {data.itemPurchaseDateLabel}
        </p>
      </div>
    );
  },
);

export default TaxInvoicePreview;
