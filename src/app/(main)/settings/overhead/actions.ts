"use server";

import { revalidatePath } from "next/cache";
import {
  currentDateString,
  parseAccrualMonth,
} from "@/lib/overhead-expenses";
import { getModifierInfo, requireAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function revalidateOverheadPaths() {
  revalidatePath("/settings/overhead");
  revalidatePath("/settings/users");
}

function readExpenseFields(formData: FormData) {
  return {
    category_id: String(formData.get("category_id") ?? "").trim(),
    expense_date: String(formData.get("expense_date") ?? "").trim(),
    accrual_month: String(formData.get("accrual_month") ?? "").trim(),
    amount: Math.round(Number(formData.get("amount") ?? 0)),
    memo: String(formData.get("memo") ?? "").trim(),
  };
}

function validateExpenseFields(fields: ReturnType<typeof readExpenseFields>) {
  if (!fields.category_id) return "판관비 항목을 선택해 주세요.";
  if (!fields.expense_date) return "발생일을 입력해 주세요.";
  if (!parseAccrualMonth(fields.accrual_month)) {
    return "귀속월 형식이 올바르지 않습니다.";
  }
  if (!Number.isFinite(fields.amount) || fields.amount < 0) {
    return "금액을 올바르게 입력해 주세요.";
  }
  return null;
}

export async function createOverheadExpense(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const fields = readExpenseFields(formData);
  const validationError = validateExpenseFields(fields);
  if (validationError) return { error: validationError };

  const accrualMonth = parseAccrualMonth(fields.accrual_month)!;
  const supabase = await createClient();
  const modifier = await getModifierInfo();
  const createdByName = "error" in modifier ? null : modifier.name;

  const { error } = await supabase.from("overhead_expenses").insert({
    category_id: fields.category_id,
    expense_date: fields.expense_date,
    accrual_month: accrualMonth,
    amount: fields.amount,
    memo: fields.memo || null,
    created_by_user_id: auth.userId,
    created_by_name: createdByName,
  });

  if (error) {
    console.error("createOverheadExpense error:", error);
    return { error: "판관비 등록에 실패했습니다." };
  }

  revalidateOverheadPaths();
  return { success: true as const };
}

export async function createOverheadCategory(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const group_name = String(formData.get("group_name") ?? "").trim();
  const item_name = String(formData.get("item_name") ?? "").trim();

  if (!group_name) return { error: "대분류를 입력해 주세요." };
  if (!item_name) return { error: "세부항목을 입력해 주세요." };

  const supabase = await createClient();
  const { data: existingGroups, error: groupError } = await supabase
    .from("overhead_categories")
    .select("group_name, group_sort_order, item_sort_order")
    .eq("is_active", true);

  if (groupError) {
    console.error("createOverheadCategory group lookup error:", groupError);
    return { error: "판관비 항목 추가에 실패했습니다." };
  }

  const sameGroupItems = (existingGroups ?? []).filter(
    (row) => row.group_name === group_name,
  );
  const maxGroupSort = Math.max(
    0,
    ...(existingGroups ?? []).map((row) => Number(row.group_sort_order) || 0),
  );

  let group_sort_order: number;
  let item_sort_order: number;

  if (sameGroupItems.length > 0) {
    group_sort_order = Number(sameGroupItems[0]?.group_sort_order) || maxGroupSort;
    item_sort_order =
      Math.max(
        ...sameGroupItems.map((row) => Number(row.item_sort_order) || 0),
      ) + 1;
  } else {
    group_sort_order = maxGroupSort + 1;
    item_sort_order = 1;
  }

  const { error } = await supabase.from("overhead_categories").insert({
    group_name,
    item_name,
    group_sort_order,
    item_sort_order,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 대분류·세부항목이 이미 있습니다." };
    }
    console.error("createOverheadCategory error:", error);
    return { error: "판관비 항목 추가에 실패했습니다." };
  }

  revalidateOverheadPaths();
  return { success: true as const };
}

export async function updateOverheadCategory(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const id = String(formData.get("category_id") ?? "").trim();
  const group_name = String(formData.get("group_name") ?? "").trim();
  const item_name = String(formData.get("item_name") ?? "").trim();

  if (!id) return { error: "항목 ID가 없습니다." };
  if (!group_name) return { error: "대분류를 입력해 주세요." };
  if (!item_name) return { error: "세부항목을 입력해 주세요." };

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("overhead_categories")
    .select("group_sort_order")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target) {
    return { error: "판관비 항목을 찾을 수 없습니다." };
  }

  let group_sort_order = Number(target.group_sort_order) || 0;
  if (group_name) {
    const { data: sameGroup } = await supabase
      .from("overhead_categories")
      .select("group_sort_order")
      .eq("group_name", group_name)
      .neq("id", id)
      .limit(1)
      .maybeSingle();

    if (sameGroup?.group_sort_order != null) {
      group_sort_order = Number(sameGroup.group_sort_order) || group_sort_order;
    }
  }

  const { error } = await supabase
    .from("overhead_categories")
    .update({
      group_name,
      item_name,
      group_sort_order,
      is_active: true,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 대분류·세부항목이 이미 있습니다." };
    }
    console.error("updateOverheadCategory error:", error);
    return { error: "판관비 항목 수정에 실패했습니다." };
  }

  revalidateOverheadPaths();
  return { success: true as const };
}

export async function deleteOverheadCategory(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const id = String(formData.get("category_id") ?? "").trim();
  if (!id) return { error: "항목 ID가 없습니다." };

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("overhead_expenses")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    console.error("deleteOverheadCategory count error:", countError);
    return { error: "판관비 항목 삭제에 실패했습니다." };
  }

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("overhead_categories")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("deleteOverheadCategory soft delete error:", error);
      return { error: "판관비 항목 비활성화에 실패했습니다." };
    }

    revalidateOverheadPaths();
    return { success: true as const, deactivated: true as const };
  }

  const { error } = await supabase.from("overhead_categories").delete().eq("id", id);

  if (error) {
    console.error("deleteOverheadCategory error:", error);
    return { error: "판관비 항목 삭제에 실패했습니다." };
  }

  revalidateOverheadPaths();
  return { success: true as const };
}

export async function updateOverheadExpense(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const expenseId = String(formData.get("expense_id") ?? "").trim();
  if (!expenseId) return { error: "내역 ID가 없습니다." };

  const fields = readExpenseFields(formData);
  const validationError = validateExpenseFields(fields);
  if (validationError) return { error: validationError };

  const accrualMonth = parseAccrualMonth(fields.accrual_month)!;
  const supabase = await createClient();

  const { error } = await supabase
    .from("overhead_expenses")
    .update({
      category_id: fields.category_id,
      expense_date: fields.expense_date,
      accrual_month: accrualMonth,
      amount: fields.amount,
      memo: fields.memo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId);

  if (error) {
    console.error("updateOverheadExpense error:", error);
    return { error: "판관비 수정에 실패했습니다." };
  }

  revalidateOverheadPaths();
  return { success: true as const };
}

export async function deleteOverheadExpense(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const expenseId = String(formData.get("expense_id") ?? "").trim();
  if (!expenseId) return { error: "내역 ID가 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("overhead_expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("deleteOverheadExpense error:", error);
    return { error: "판관비 삭제에 실패했습니다." };
  }

  revalidateOverheadPaths();
  return { success: true as const };
}

export { currentDateString };
