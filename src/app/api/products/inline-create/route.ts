import type { InlineProductCreateInput } from "@/lib/inline-product-create-shared";
import { createInlineProduct } from "@/lib/inline-product-create";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: InlineProductCreateInput;

  try {
    body = (await request.json()) as InlineProductCreateInput;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const result = await createInlineProduct(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
