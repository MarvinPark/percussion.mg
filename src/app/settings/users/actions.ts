"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/profile";

function mapRoleUpdateError(message: string) {
  const known = [
    "역할 변경 권한이 없습니다.",
    "올바르지 않은 역할입니다.",
    "본인의 관리자 권한은 스스로 해제할 수 없습니다.",
    "마지막 관리자의 권한은 변경할 수 없습니다.",
    "사용자를 찾을 수 없습니다.",
  ];

  for (const text of known) {
    if (message.includes(text)) return text;
  }

  if (message.includes("update_user_role")) {
    return "역할 변경 기능이 DB에 없습니다. supabase/schema-phase7-admin-policy.sql을 Supabase SQL Editor에서 실행해 주세요.";
  }

  return "역할 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();
  const auth = await requirePermission(supabase, "manageUsers");

  if ("error" in auth) {
    return { error: auth.error };
  }

  const { error } = await supabase.rpc("update_user_role", {
    target_user_id: userId,
    new_role: role,
  });

  if (error) {
    return { error: mapRoleUpdateError(error.message) };
  }

  revalidatePath("/settings/users");
  revalidatePath("/", "layout");
  return { success: true as const };
}
