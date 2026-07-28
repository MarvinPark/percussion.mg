import { NextResponse } from "next/server";
import { buildQuoteExcelBuffer, buildQuoteFileName } from "@/lib/quote-excel";
import { calculateQuoteLine } from "@/lib/quote-calculator";
import type { QuoteFormData, QuoteItemInput } from "@/types/quote";

function normalizeItems(items: QuoteItemInput[]): QuoteItemInput[] {
  return items.map((item) => {
    const calculated = calculateQuoteLine({
      quantity: item.quantity,
      consumerPrice: item.consumer_price,
      saleUnitPrice: item.sale_unit_price,
      purchasePrice: item.purchase_price,
      shippingCost: item.shipping_cost,
    });

    return {
      ...item,
      rounded_unit_price: calculated.roundedUnitPrice,
      line_total: calculated.lineTotal,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuoteFormData;

    if (!body.customer_name || !body.items?.length) {
      return NextResponse.json(
        { error: "고객 정보와 제품을 입력해 주세요." },
        { status: 400 },
      );
    }

    const payload: QuoteFormData = {
      ...body,
      items: normalizeItems(body.items),
    };

    const buffer = buildQuoteExcelBuffer(payload);
    const filename = buildQuoteFileName(
      payload.customer_name,
      payload.quote_date,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("quote download error:", error);
    return NextResponse.json(
      { error: "견적서 엑셀 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
