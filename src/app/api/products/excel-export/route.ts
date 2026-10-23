import { createProductExportBuffer } from "@/lib/excel-products";
import {
  fetchProductsForExport,
  normalizeProductExportIds,
  normalizeProductSearchQuery,
} from "@/lib/product-list-loader";
import { parseProductListSort } from "@/lib/product-list-sort";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function buildExcelResponse(
  buffer: Buffer,
  filename: string,
) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

function parseScopeFilters(searchParams: URLSearchParams) {
  return {
    category: searchParams.get("category")?.trim() ?? "",
    brand: searchParams.get("brand")?.trim() ?? "",
  };
}

function parseExportSort(searchParams: URLSearchParams) {
  return parseProductListSort(
    searchParams.get("sort") ?? undefined,
    searchParams.get("order") ?? undefined,
  );
}

function filteredExportFilename(
  searchQuery: string,
  scopeFilters: { category?: string; brand?: string },
) {
  const hasScope = Boolean(scopeFilters.category || scopeFilters.brand);
  return searchQuery || hasScope ? "검색제품목록.xlsx" : "제품목록.xlsx";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const normalizedSearch = normalizeProductSearchQuery(
    searchParams.get("q") ?? "",
  );
  if (normalizedSearch.error) {
    return NextResponse.json({ error: normalizedSearch.error }, { status: 400 });
  }

  const searchQuery = normalizedSearch.searchQuery;
  const sort = parseExportSort(searchParams);
  const scopeFilters = parseScopeFilters(searchParams);

  const { products, error } = await fetchProductsForExport(supabase, {
    searchQuery,
    sort,
    scopeFilters,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const buffer = createProductExportBuffer(products);
  return buildExcelResponse(
    buffer,
    filteredExportFilename(searchQuery, scopeFilters),
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const ids = normalizeProductExportIds(
    Array.isArray((body as { ids?: unknown }).ids)
      ? ((body as { ids: string[] }).ids ?? [])
      : [],
  );

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "다운로드할 제품을 선택해 주세요." },
      { status: 400 },
    );
  }

  const sort = parseExportSort(new URL(request.url).searchParams);

  const { products, error } = await fetchProductsForExport(supabase, {
    ids,
    sort,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (products.length === 0) {
    return NextResponse.json(
      { error: "선택한 제품을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const buffer = createProductExportBuffer(products);
  return buildExcelResponse(buffer, "선택제품목록.xlsx");
}
