import { createProductExportBuffer } from "@/lib/excel-products";
import { recordAppUsage } from "@/lib/app-usage";
import {
  fetchProductsForExport,
} from "@/lib/product-list-loader";
import { parseProductListSort } from "@/lib/product-list-sort";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const sort = parseProductListSort(
    searchParams.get("sort") ?? undefined,
    searchParams.get("order") ?? undefined,
  );

  const { products, error } = await fetchProductsForExport(supabase, {
    searchQuery,
    sort,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const buffer = createProductExportBuffer(products);
  const filename = searchQuery ? "검색제품목록.xlsx" : "제품목록.xlsx";

  await recordAppUsage(supabase, {
    eventType: "excel_download",
    userId: user.id,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
