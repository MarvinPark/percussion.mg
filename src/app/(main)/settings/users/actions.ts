"use server";

import { revalidatePath } from "next/cache";
import { getRoleChangeRpcAvailable } from "@/lib/admin-settings-probes";
import { getAppUrl } from "@/lib/app-url";
import { invalidateOrphanAuthUserCache, profileFromAuthUser } from "@/lib/auth-registration";
import { invalidateAuthProfileCache } from "@/lib/profile-auth";
import type { RolePermissionMap } from "@/lib/permissions";
import { requirePermission } from "@/lib/profile";
import {
  saveRolePermissionMap,
  sanitizeRolePermissionMap,
} from "@/lib/role-permission-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/profile";

function revalidateAdminPaths() {
  revalidatePath("/settings/users");
  invalidateOrphanAuthUserCache();
}

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

  if (isMissingRoleChangeRpc(message)) {
    return "역할 변경 기능이 DB에 없습니다. Supabase SQL Editor에서 supabase/schema-phase7-admin-policy.sql 파일 내용을 실행해 주세요.";
  }

  return "역할 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function isMissingRoleChangeRpc(message: string) {
  return (
    message.includes("update_user_role") ||
    message.includes("Could not find the function") ||
    message.includes("42883")
  );
}

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "manager" || value === "employee";
}

async function updateUserRoleViaAdmin(
  adminClient: ReturnType<typeof createAdminClient>,
  callerUserId: string,
  targetUserId: string,
  newRole: UserRole,
) {
  if (!isUserRole(newRole)) {
    return { error: "올바르지 않은 역할입니다." };
  }

  const { data: caller } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", callerUserId)
    .maybeSingle();

  if (caller?.role !== "admin") {
    return { error: "역할 변경 권한이 없습니다." };
  }

  if (targetUserId === callerUserId && newRole !== "admin") {
    return { error: "본인의 관리자 권한은 스스로 해제할 수 없습니다." };
  }

  const { data: target } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!target) {
    return { error: "사용자를 찾을 수 없습니다." };
  }

  const { count: adminCount } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (adminCount === 1 && target.role === "admin" && newRole !== "admin") {
    return { error: "마지막 관리자의 권한은 변경할 수 없습니다." };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  if (error) {
    return { error: mapRoleUpdateError(error.message) };
  }

  return { success: true as const };
}

export async function checkRoleChangeRpcAvailable() {
  return getRoleChangeRpcAvailable();
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");

  if ("error" in auth) {
    return { error: auth.error };
  }

  const { error } = await supabase.rpc("update_user_role", {
    target_user_id: userId,
    new_role: role,
  });

  if (error) {
    if (isMissingRoleChangeRpc(error.message)) {
      try {
        const adminClient = createAdminClient();
        const fallback = await updateUserRoleViaAdmin(
          adminClient,
          auth.userId,
          userId,
          role,
        );

        if ("error" in fallback && fallback.error) {
          return { error: fallback.error };
        }

        revalidateAdminPaths();
        invalidateAuthProfileCache(userId);
        return { success: true as const };
      } catch {
        return { error: mapRoleUpdateError(error.message) };
      }
    }

    return { error: mapRoleUpdateError(error.message) };
  }

  revalidateAdminPaths();
  invalidateAuthProfileCache(userId);
  return { success: true as const };
}

export async function inviteUser(formData: FormData) {
  const auth = await requirePermission("manageUsers");
  if ("error" in auth) {
    return { error: auth.error };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const job_title = String(formData.get("job_title") ?? "").trim();
  const role = String(formData.get("role") ?? "employee") as UserRole;

  if (!email) {
    return { error: "이메일을 입력해 주세요." };
  }

  if (!job_title) {
    return { error: "직함을 입력해 주세요." };
  }

  if (role !== "admin" && role !== "manager" && role !== "employee") {
    return { error: "올바르지 않은 역할입니다." };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "관리자 API 설정이 필요합니다.",
    };
  }

  const redirectTo = `${getAppUrl()}/auth/callback?next=/profile/setup`;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

  if (inviteError) {
    if (inviteError.message.includes("already been registered")) {
      return { error: "이미 등록된 이메일입니다." };
    }
    return { error: `초대 메일 발송에 실패했습니다: ${inviteError.message}` };
  }

  const userId = inviteData.user?.id;
  if (!userId) {
    return { error: "초대 사용자 정보를 확인할 수 없습니다." };
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    full_name: "미등록",
    job_title,
    phone: "미등록",
    role,
    account_status: "pending_setup",
    email,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return {
      error:
        "프로필 생성에 실패했습니다. supabase/schema-admin-settings.sql을 실행했는지 확인해 주세요.",
    };
  }

  revalidateAdminPaths();
  return { success: true as const };
}

export async function updateUserJobTitle(userId: string, jobTitle: string) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");

  if ("error" in auth) {
    return { error: auth.error };
  }

  const trimmed = jobTitle.trim();
  if (!trimmed) {
    return { error: "직함을 입력해 주세요." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ job_title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return { error: "직함 수정에 실패했습니다." };
  }

  revalidateAdminPaths();
  return { success: true as const };
}

export async function approveUser(userId: string, jobTitleInput?: string) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");

  if ("error" in auth) {
    return { error: auth.error };
  }

  const trimmedJobTitle = jobTitleInput?.trim() ?? "";

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("account_status, job_title")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    return { error: "사용자를 찾을 수 없습니다." };
  }

  if (!profile) {
    if (!trimmedJobTitle) {
      return { error: "승인 전 직함을 입력해 주세요." };
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "관리자 API 설정이 필요합니다.",
      };
    }

    const { data: authData, error: authUserError } =
      await adminClient.auth.admin.getUserById(userId);

    if (authUserError || !authData.user) {
      return { error: "가입 계정을 찾을 수 없습니다." };
    }

    const profilePayload = profileFromAuthUser(authData.user);
    const { error: createError } = await adminClient.from("profiles").upsert({
      ...profilePayload,
      job_title: trimmedJobTitle,
      account_status: "active",
      updated_at: new Date().toISOString(),
    });

    if (createError) {
      return {
        error:
          "프로필 생성에 실패했습니다. supabase/schema-admin-settings.sql을 실행했는지 확인해 주세요.",
      };
    }

    revalidateAdminPaths();
    invalidateAuthProfileCache(userId);
    return { success: true as const };
  }

  if (profile.account_status !== "pending_approval") {
    return { error: "승인 대기 중인 사용자만 승인할 수 있습니다." };
  }

  const jobTitle = trimmedJobTitle || profile.job_title?.trim() || "";
  if (!jobTitle) {
    return { error: "승인 전 직함을 입력해 주세요." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      job_title: jobTitle,
      account_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: "승인 처리에 실패했습니다." };
  }

  revalidateAdminPaths();
  invalidateAuthProfileCache(userId);
  return { success: true as const };
}

export async function createSaleCategoryOption(formData: FormData) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");
  if ("error" in auth) return { error: auth.error };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "구분 이름을 입력해 주세요." };

  const { data: lastOption } = await supabase
    .from("sale_category_options")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (lastOption?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("sale_category_options").insert({
    name,
    sort_order,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 이름의 구분이 이미 있습니다." };
    }
    if (error.code === "42P01") {
      return {
        error:
          "견적 구분 테이블이 없습니다. supabase/schema-admin-settings.sql을 실행해 주세요.",
      };
    }
    return { error: "구분 추가에 실패했습니다." };
  }

  revalidateSaleCategoryPaths();
  return { ok: true as const };
}

export async function updateSaleCategoryOption(formData: FormData) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");
  if ("error" in auth) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "수정할 구분을 찾을 수 없습니다." };
  if (!name) return { error: "구분 이름을 입력해 주세요." };

  const { error } = await supabase
    .from("sale_category_options")
    .update({ name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "같은 이름의 구분이 이미 있습니다." };
    }
    return { error: "구분 수정에 실패했습니다." };
  }

  revalidateSaleCategoryPaths();
  return { ok: true as const };
}

export async function deleteSaleCategoryOption(formData: FormData) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");
  if ("error" in auth) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "삭제할 구분을 찾을 수 없습니다." };

  const { error } = await supabase
    .from("sale_category_options")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "구분 삭제에 실패했습니다." };
  }

  revalidateSaleCategoryPaths();
  return { ok: true as const };
}

function revalidateSaleCategoryPaths() {
  revalidatePath("/settings/users");
  revalidatePath("/sales");
  revalidatePath("/sales/new");
  revalidatePath("/quotes");
  revalidatePath("/quotes/new");
  revalidatePath("/dashboard");
}

export async function updateRolePermissions(map: RolePermissionMap) {
  const supabase = await createClient();
  const auth = await requirePermission("manageUsers");
  if ("error" in auth) return { error: auth.error };

  const sanitized = sanitizeRolePermissionMap(map);
  const result = await saveRolePermissionMap(supabase, sanitized);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidateAdminPaths();
  revalidateSaleCategoryPaths();
  revalidatePath("/dashboard");
  revalidatePath("/products");
  return { ok: true as const };
}
