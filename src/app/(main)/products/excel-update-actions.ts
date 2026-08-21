"use server";

import { requirePermission } from "@/lib/profile";
import { DUPLICATE_SKU_MESSAGE } from "@/lib/product-duplicate";
import { parseAndMatchProductUpdates } from "@/lib/excel-product-update";
import { fetchAllProducts } from "@/lib/product-list-loader";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Product } from "@/types/product";

export type ExcelUpdateResult = {
  successCount?: number;
  usedAi?: boolean;
  errors?: string[];
  error?: string;
};

function validateUploadedFile(file: FormDataEntryValue | null) {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해 주세요." };
  }

  if (
    !file.name.endsWith(".xlsx") &&
    !file.name.endsWith(".xls") &&
    file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    file.type !== "application/vnd.ms-excel"
  ) {
    return { error: "xlsx 또는 xls 파일만 업로드할 수 있습니다." };
  }

  return { file };
}

export async function updateProductsFromExcel(
  _prev: ExcelUpdateResult | null,
  formData: FormData,
): Promise<ExcelUpdateResult> {
  const fileResult = validateUploadedFile(formData.get("file"));
  if ("error" in fileResult) {
    return { error: fileResult.error };
  }

  const { file } = fileResult;

  const supabase = await createClient();
  const auth = await requirePermission("manageProducts");
  if ("error" in auth) return { error: auth.error };

  const { products, error: productsError } = await fetchAllProducts(supabase);

  if (productsError || !products.length) {
    return {
      error: productsError ?? "수정할 등록 제품이 없습니다. 먼저 제품을 등록해 주세요.",
    };
  }

  const buffer = await file.arrayBuffer();
  const parsed = await parseAndMatchProductUpdates(
    buffer,
    products as Product[],
  );

  if (!parsed.updates?.length) {
    return {
      error: parsed.error ?? "수정된 제품이 없습니다.",
      errors: parsed.errors,
      usedAi: parsed.usedAi,
    };
  }

  let successCount = 0;
  const errors = [...(parsed.errors ?? [])];

  for (const item of parsed.updates) {
    const { error: dbError } = await supabase
      .from("products")
      .update({
        ...item.payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.product.id);

    if (dbError) {
      if (dbError.code === "23505") {
        errors.push(`${item.rowNumber}행: ${DUPLICATE_SKU_MESSAGE}`);
      } else {
        errors.push(`${item.rowNumber}행: 수정에 실패했습니다.`);
      }
      continue;
    }

    if (
      typeof item.payload.stock_quantity === "number" &&
      item.payload.stock_quantity !== item.product.stock_quantity
    ) {
      try {
        await supabase.from("stock_movements").insert({
          product_id: item.product.id,
          movement_type: "adjust",
          quantity: Math.abs(
            item.payload.stock_quantity - item.product.stock_quantity,
          ),
          stock_before: item.product.stock_quantity,
          stock_after: item.payload.stock_quantity,
          note: "엑셀 일괄 수정",
        });
      } catch {
        // 재고 이력 테이블이 없어도 수정은 유지합니다.
      }
    }

    successCount++;
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/products/history");

  if (successCount === 0) {
    return {
      error: "수정된 제품이 없습니다.",
      errors,
      usedAi: parsed.usedAi,
    };
  }

  return {
    successCount,
    errors: errors.length ? errors : undefined,
    usedAi: parsed.usedAi,
  };
}
