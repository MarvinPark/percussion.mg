import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  cloneRolePermissionMap,
  isPermission,
  type Permission,
  type RolePermissionMap,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/profile";

function isMissingRolePermissionsTable(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("role_permission_grants") ||
    message.includes("does not exist") ||
    message.includes("42P01")
  );
}

function buildRolePermissionMapFromRows(
  rows: { role: string; permission: string }[],
): RolePermissionMap {
  const map = cloneRolePermissionMap(DEFAULT_ROLE_PERMISSIONS);

  for (const role of Object.keys(map) as UserRole[]) {
    map[role] = [];
  }

  for (const row of rows) {
    const role = row.role;
    if (role !== "admin" && role !== "manager" && role !== "employee") {
      continue;
    }
    if (!isPermission(row.permission)) continue;
    if (!map[role].includes(row.permission)) {
      map[role].push(row.permission);
    }
  }

  for (const role of Object.keys(map) as UserRole[]) {
    if (map[role].length === 0) {
      map[role] = [...DEFAULT_ROLE_PERMISSIONS[role]];
    }
  }

  ensureAdminSafety(map);
  return map;
}

function ensureAdminSafety(map: RolePermissionMap) {
  if (!map.admin.includes("manageUsers")) {
    map.admin = [...map.admin, "manageUsers"];
  }
}

export async function fetchRolePermissionMap(
  supabase: SupabaseClient,
): Promise<RolePermissionMap> {
  const { data, error } = await supabase
    .from("role_permission_grants")
    .select("role, permission");

  if (error) {
    if (isMissingRolePermissionsTable(error.message)) {
      return cloneRolePermissionMap(DEFAULT_ROLE_PERMISSIONS);
    }
    return cloneRolePermissionMap(DEFAULT_ROLE_PERMISSIONS);
  }

  if (!data?.length) {
    return cloneRolePermissionMap(DEFAULT_ROLE_PERMISSIONS);
  }

  return buildRolePermissionMapFromRows(data);
}

export const getRolePermissionMap = cache(async (): Promise<RolePermissionMap> => {
  const supabase = await createClient();
  return fetchRolePermissionMap(supabase);
});

export function sanitizeRolePermissionMap(
  input: Partial<Record<UserRole, Permission[]>>,
): RolePermissionMap {
  const map = cloneRolePermissionMap(DEFAULT_ROLE_PERMISSIONS);

  for (const role of Object.keys(map) as UserRole[]) {
    const permissions = input[role];
    if (!Array.isArray(permissions)) continue;

    map[role] = permissions.filter((permission) =>
      ALL_PERMISSIONS.includes(permission),
    );
  }

  ensureAdminSafety(map);
  return map;
}

export async function saveRolePermissionMap(
  supabase: SupabaseClient,
  map: RolePermissionMap,
) {
  const sanitized = sanitizeRolePermissionMap(map);

  for (const role of Object.keys(sanitized) as UserRole[]) {
    const { error: deleteError } = await supabase
      .from("role_permission_grants")
      .delete()
      .eq("role", role);

    if (deleteError) {
      if (isMissingRolePermissionsTable(deleteError.message)) {
        return {
          error:
            "역할 권한 테이블이 없습니다. Supabase SQL Editor에서 supabase/schema-role-permissions.sql을 실행해 주세요.",
        };
      }
      return { error: "역할 권한 저장에 실패했습니다." };
    }

    const rows = sanitized[role].map((permission) => ({
      role,
      permission,
    }));

    if (rows.length === 0) continue;

    const { error: insertError } = await supabase
      .from("role_permission_grants")
      .insert(rows);

    if (insertError) {
      return { error: "역할 권한 저장에 실패했습니다." };
    }
  }

  return { ok: true as const };
}
