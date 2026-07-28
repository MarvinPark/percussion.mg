"use server";

import {
  excelRowToPayload,
  parseProductExcelBuffer,
  validateExcelProductRow,
} from "@/lib/excel-products";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ExcelImportResult = {
  successCount?: number;
  errors?: string[];
  error?: string;
};

export async function importProductsFromExcel(
  _prev: ExcelImportResult | null,
  formData: FormData,
): Promise<ExcelImportResult> {
  const file = formData.get("file");

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해 주세요." };
  }

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  if (
    !allowedTypes.includes(file.type) &&
    !file.name.endsWith(".xlsx") &&
    !file.name.endsWith(".xls")
  ) {
    return { error: "xlsx 또는 xls 파일만 업로드할 수 있습니다." };
  }

  const buffer = await file.arrayBuffer();
  const { rows, error: parseError } = parseProductExcelBuffer(buffer);

  if (parseError) {
    return { error: parseError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  let successCount = 0;
  const errors: string[] = [];

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const row = rows[index];
    const validationError = validateExcelProductRow(row, rowNumber);

    if (validationError) {
      errors.push(validationError);
      continue;
    }

    const { error: dbError } = await supabase
      .from("products")
      .insert(excelRowToPayload(row));

    if (dbError) {
      if (dbError.code === "23505") {
        errors.push(
          `${rowNumber}행: 같은 SKU, 공급처, 색상/옵션/사이즈 조합이 이미 있습니다.`,
        );
      } else {
        errors.push(`${rowNumber}행: 등록에 실패했습니다.`);
      }
      continue;
    }

    successCount++;
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  if (successCount === 0) {
    return {
      error: "등록된 제품이 없습니다.",
      errors,
    };
  }

  return {
    successCount,
    errors: errors.length ? errors : undefined,
  };
}
