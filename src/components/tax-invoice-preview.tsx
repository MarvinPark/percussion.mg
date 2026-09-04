"use client";

import { forwardRef } from "react";
import { formatKRW } from "@/lib/sales-calculator";
import type { TaxInvoicePreviewData } from "@/lib/tax-invoice-preview-data";

type TaxInvoicePreviewProps = {
  data: TaxInvoicePreviewData;
  className?: string;
};

const border = "border border-zinc-300";
const outerBorder = "border border-zinc-400";
const cell = `${border} px-1 py-0.5 text-[10px] leading-tight align-middle`;
const headerCell = `${cell} bg-zinc-50 text-center font-semibold text-zinc-700`;
const valueCell = `${cell} text-zinc-900`;
const itemRowCell = `${valueCell} h-7 min-h-[28px]`;

type PartyVariant = "supplier" | "buyer";

const partyTheme: Record<
  PartyVariant,
  { top: string; vertical: string; label: string }
> = {
  supplier: {
    top: "border-t-2 border-t-red-500",
    vertical: "bg-red-100 text-red-800 font-bold",
    label: "bg-[#ffeaea] text-zinc-900 font-semibold",
  },
  buyer: {
    top: "border-t-2 border-t-blue-500",
    vertical: "bg-blue-100 text-blue-800 font-bold",
    label: "bg-[#eaf4ff] text-zinc-900 font-semibold",
  },
};

function splitMonthDay(monthDay: string) {
  const [month = "", day = ""] = monthDay.split("/");
  return { month, day };
}

function PartyBlock({
  title,
  party,
  variant,
}: {
  title: string;
  party: TaxInvoicePreviewData["supplier"];
  variant: PartyVariant;
}) {
  const theme = partyTheme[variant];
  const labelCell = `${border} flex items-center justify-center px-0.5 py-0.5 text-center text-[9px] leading-snug ${theme.label}`;
  const fieldCell = `${valueCell} flex items-start py-0.5`;
  const corpNumLabelCell = `${labelCell} py-1 text-[10px]`;
  const corpNumFieldCell = `${fieldCell} py-1 text-[13px] font-bold leading-none tracking-wide`;

  return (
    <div
      className={`grid h-full min-h-0 ${theme.top}`}
      style={{
        gridTemplateColumns: "20px 54px minmax(0,1fr) 54px minmax(0,1fr)",
        gridTemplateRows: "auto auto auto auto auto minmax(1.25rem, 1fr)",
      }}
    >
      <div
        className={`${border} flex items-center justify-center px-0.5 py-0.5 text-[11px] ${theme.vertical}`}
        style={{ gridColumn: 1, gridRow: "1 / 7" }}
      >
        <span
          className="inline-block"
          style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
        >
          {title}
        </span>
      </div>

      <div className={corpNumLabelCell} style={{ gridColumn: 2, gridRow: 1 }}>
        등록번호
      </div>
      <div className={corpNumFieldCell} style={{ gridColumn: "3 / 6", gridRow: 1 }}>
        {party.corpNum}
      </div>

      <div className={labelCell} style={{ gridColumn: 2, gridRow: 2 }}>
        종사업장
        <br />
        번호
      </div>
      <div className={fieldCell} style={{ gridColumn: "3 / 6", gridRow: 2 }}>
        -
      </div>

      <div className={labelCell} style={{ gridColumn: 2, gridRow: 3 }}>
        상호
        <br />
        (법인명)
      </div>
      <div className={fieldCell} style={{ gridColumn: 3, gridRow: 3 }}>
        {party.corpName}
      </div>
      <div className={labelCell} style={{ gridColumn: 4, gridRow: 3 }}>
        성명
      </div>
      <div className={fieldCell} style={{ gridColumn: 5, gridRow: 3 }}>
        {party.ceoName}
      </div>

      <div className={labelCell} style={{ gridColumn: 2, gridRow: 4 }}>
        사업장주소
      </div>
      <div className={fieldCell} style={{ gridColumn: "3 / 6", gridRow: 4 }}>
        {party.address}
      </div>

      <div className={labelCell} style={{ gridColumn: 2, gridRow: 5 }}>
        업태
      </div>
      <div className={fieldCell} style={{ gridColumn: 3, gridRow: 5 }}>
        {party.bizType}
      </div>
      <div className={labelCell} style={{ gridColumn: 4, gridRow: 5 }}>
        종목
      </div>
      <div className={fieldCell} style={{ gridColumn: 5, gridRow: 5 }}>
        {party.bizClass}
      </div>

      <div className={`${labelCell} h-full items-start`} style={{ gridColumn: 2, gridRow: 6 }}>
        이메일
      </div>
      <div className={`${fieldCell} h-full`} style={{ gridColumn: "3 / 6", gridRow: 6 }}>
        {party.email || "\u00a0"}
      </div>
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

    const purposeLabel = data.purposeType === "영수" ? "영수" : "청구";
    const cashAmount = data.purposeType === "영수" ? data.totalAmount : 0;
    const receivableAmount = data.purposeType === "청구" ? data.totalAmount : 0;

    return (
      <div
        ref={ref}
        className={`tax-invoice-preview mx-auto w-full max-w-[820px] bg-white p-2 text-zinc-900 ${className}`}
      >
        <table className={`w-full border-collapse ${outerBorder}`}>
          <tbody>
            <tr>
              <td className={`${border} px-2 py-2 text-center`} colSpan={10}>
                <div className="relative min-h-[28px]">
                  <h3 className="text-[17px] font-bold tracking-[0.2em] text-zinc-900">
                    전자세금계산서
                  </h3>
                  <p className="absolute right-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-zinc-700">
                    승인번호{" "}
                    <span className="font-medium tabular-nums">
                      {data.approvalNumber || ""}
                    </span>
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td className={`${border} p-0`} colSpan={10}>
                <div className="grid grid-cols-2 items-stretch">
                  <div className={`${border} h-full min-h-0 border-b-0 border-l-0 border-t-0`}>
                    <PartyBlock title="공급자" party={data.supplier} variant="supplier" />
                  </div>
                  <div className="h-full min-h-0">
                    <PartyBlock title="공급받는자" party={data.buyer} variant="buyer" />
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td className={headerCell} colSpan={2}>
                작성일자
              </td>
              <td className={headerCell} colSpan={2}>
                공급가액
              </td>
              <td className={headerCell} colSpan={2}>
                세액
              </td>
              <td className={headerCell} colSpan={2}>
                수정사유
              </td>
              <td className={headerCell} colSpan={2}>
                비고
              </td>
            </tr>
            <tr>
              <td className={`${valueCell} text-center tabular-nums`} colSpan={2}>
                {data.writeDateCompact}
              </td>
              <td className={`${valueCell} text-right tabular-nums`} colSpan={2}>
                {formatKRW(data.supplyCostTotal)}
              </td>
              <td className={`${valueCell} text-right tabular-nums`} colSpan={2}>
                {formatKRW(data.taxTotal)}
              </td>
              <td className={valueCell} colSpan={2}>
                -
              </td>
              <td className={valueCell} colSpan={2}>
                {data.remark || ""}
              </td>
            </tr>

            <tr>
              <td className={`${headerCell} w-8`}>월</td>
              <td className={`${headerCell} w-8`}>일</td>
              <td className={headerCell} colSpan={2}>
                품목
              </td>
              <td className={`${headerCell} w-14`}>규격</td>
              <td className={`${headerCell} w-10`}>수량</td>
              <td className={headerCell}>단가</td>
              <td className={headerCell}>공급가액</td>
              <td className={headerCell}>세액</td>
              <td className={headerCell}>비고</td>
            </tr>

            {paddedItems.slice(0, 4).map((item, index) => {
              const { month, day } = splitMonthDay(item.monthDay);
              const emptyCell = "\u00a0";
              return (
                <tr key={`${item.name}-${index}`}>
                  <td className={`${itemRowCell} text-center`}>{month || emptyCell}</td>
                  <td className={`${itemRowCell} text-center`}>{day || emptyCell}</td>
                  <td className={`${itemRowCell}`} colSpan={2}>
                    {item.name || emptyCell}
                  </td>
                  <td className={itemRowCell}>{item.spec || emptyCell}</td>
                  <td className={`${itemRowCell} text-center`}>{item.qty || emptyCell}</td>
                  <td className={`${itemRowCell} text-right tabular-nums`}>
                    {item.unitCost ? formatKRW(item.unitCost) : emptyCell}
                  </td>
                  <td className={`${itemRowCell} text-right tabular-nums`}>
                    {item.supplyCost ? formatKRW(item.supplyCost) : emptyCell}
                  </td>
                  <td className={`${itemRowCell} text-right tabular-nums`}>
                    {item.tax ? formatKRW(item.tax) : emptyCell}
                  </td>
                  <td className={itemRowCell}>{item.remark || emptyCell}</td>
                </tr>
              );
            })}

            <tr>
              <td className={headerCell} colSpan={2}>
                합계금액
              </td>
              <td className={headerCell} colSpan={2}>
                현금
              </td>
              <td className={headerCell} colSpan={2}>
                수표
              </td>
              <td className={headerCell} colSpan={2}>
                어음
              </td>
              <td className={headerCell} colSpan={2}>
                외상미수금
              </td>
            </tr>
            <tr>
              <td className={`${valueCell} text-right font-semibold tabular-nums`} colSpan={2}>
                {formatKRW(data.totalAmount)}
              </td>
              <td className={`${valueCell} text-right tabular-nums`} colSpan={2}>
                {cashAmount ? formatKRW(cashAmount) : ""}
              </td>
              <td className={valueCell} colSpan={2} />
              <td className={valueCell} colSpan={2} />
              <td className={valueCell} colSpan={2}>
                <div className="flex items-start justify-between gap-2">
                  <span className="tabular-nums">
                    {receivableAmount ? formatKRW(receivableAmount) : ""}
                  </span>
                  <span className="whitespace-nowrap text-[10px]">
                    이 금액을 ({purposeLabel}) 함
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-2 px-1 text-[9px] leading-relaxed text-zinc-600">
          본 전자세금계산서는 부가가치세법 제32조의2 제3항에 따라 발급되었으며, 국세청
          홈택스(www.hometax.go.kr)에서 발급사실 확인이 가능합니다.
        </p>
      </div>
    );
  },
);

export default TaxInvoicePreview;
