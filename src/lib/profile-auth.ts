import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeRole } from "@/lib/permissions";
import {
  normalizeAccountStatus,
  type AccountStatus,
  type UserRole,
} from "@/types/profile";

export type AuthProfile = {
  full_name: string;
  job_title: string | null;
  phone: string;
  role: UserRole;
  account_status: AccountStatus;
};

const AUTH_PROFILE_TTL_MS = 30_000;
const authProfileCache = new Map<
  string,
  { profile: AuthProfile | null; expiresAt: number }
>();

export function invalidateAuthProfileCache(userId?: string) {
  if (userId) {
    authProfileCache.delete(userId);
    return;
  }
  authProfileCache.clear();
}

function isMissingColumnError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("account_status") ||
    message.includes("does not exist") ||
    message.includes("42703")
  );
}

async function fetchAuthProfileFromDb(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthProfile | null> {
  const extended = await supabase
    .from("profiles")
    .select("full_name, job_title, phone, role, account_status")
    .eq("id", userId)
    .maybeSingle();

  if (!extended.error && extended.data) {
    return {
      full_name: extended.data.full_name ?? "",
      job_title: extended.data.job_title,
      phone: extended.data.phone ?? "",
      role: normalizeRole(extended.data.role),
      account_status: normalizeAccountStatus(extended.data.account_status),
    };
  }

  if (!isMissingColumnError(extended.error?.message)) {
    return null;
  }

  const base = await supabase
    .from("profiles")
    .select("full_name, job_title, phone, role")
    .eq("id", userId)
    .maybeSingle();

  if (!base.data) return null;

  return {
    full_name: base.data.full_name ?? "",
    job_title: base.data.job_title,
    phone: base.data.phone ?? "",
    role: normalizeRole(base.data.role),
    account_status: "active",
  };
}

/** account_status 컬럼이 없는 DB에서도 기존 사용자 로그인이 되도록 조회 */
export async function fetchAuthProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthProfile | null> {
  const cached = authProfileCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.profile;
  }

  const profile = await fetchAuthProfileFromDb(supabase, userId);
  authProfileCache.set(userId, {
    profile,
    expiresAt: Date.now() + AUTH_PROFILE_TTL_MS,
  });
  return profile;
}
