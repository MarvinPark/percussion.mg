import { createProductUpdateTemplateBuffer } from "@/lib/excel-product-update";
import { fetchAllRows } from "@/lib/supabase-paginate";
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

  // 페이지 경계가 흔들리지 않도록 id 순으로 읽고, 표시 순서는 뒤에서 맞춥니다.
  const { rows: products, error } = await fetchAllRows<Product>((from, to) =>
    supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true })
      .range(from, to),
  );

  if (error) {
    return NextResponse.json(
      { error: "제품 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const sorted = [...products].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const buffer = createProductUpdateTemplateBuffer(sorted);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="percussioncenter-product-update.xlsx"',
    },
  });
}
