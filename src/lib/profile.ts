import type { SupabaseClient } from "@supabase/supabase-js";
import { isProfileComplete, type Profile, type UserRole } from "@/types/profile";
import {
  hasPermission,
  normalizeRole,
  type Permission,
} from "@/lib/permissions";

const PROFILE_BASE_SELECT =
  "id, full_name, job_title, phone, created_at, updated_at";

/** role 컬럼(schema-phase7)이 없어도 기본값 employee로 동작 */
export async function fetchUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRole> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "employee";
  return normalizeRole(data.role);
}

export async function getCurrentUserProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select(PROFILE_BASE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (!baseProfile) return { user, profile: null };

  const role = await fetchUserRole(supabase, user.id);
  const profile: Profile = { ...baseProfile, role };

  return { user, profile };
}

export function formatManagerDisplayName(
  fullName: string | null | undefined,
  jobTitle: string | null | undefined,
) {
  const name = fullName?.trim() ?? "";
  const title = jobTitle?.trim() ?? "";

  if (name && title) return `${name} ${title}`;
  return name || title;
}

export async function getModifierInfo(supabase: SupabaseClient) {
  const { user, profile } = await getCurrentUserProfile(supabase);

  if (!user) {
    return { error: "로그인이 필요합니다." as const };
  }

  if (!isProfileComplete(profile)) {
    return {
      error: "이름, 직함, 전화번호를 등록한 후 이용할 수 있습니다." as const,
    };
  }

  return {
    userId: user.id,
    name: profile!.full_name,
    role: normalizeRole(profile!.role),
  };
}

export async function requirePermission(
  supabase: SupabaseClient,
  permission: Permission,
) {
  const modifier = await getModifierInfo(supabase);

  if ("error" in modifier) {
    return modifier;
  }

  if (!hasPermission(modifier.role, permission)) {
    return { error: "이 작업을 할 권한이 없습니다." as const };
  }

  return modifier;
}

export async function getUserRole(
  supabase: SupabaseClient,
): Promise<UserRole> {
  const { profile } = await getCurrentUserProfile(supabase);
  return normalizeRole(profile?.role);
}
