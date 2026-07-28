import { createProductUpdateTemplateBuffer } from "@/lib/excel-product-update";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Product } from "@/types/product";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "제품 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const buffer = createProductUpdateTemplateBuffer((products ?? []) as Product[]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="percussioncenter-product-update.xlsx"',
    },
  });
}
