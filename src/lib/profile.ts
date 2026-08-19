import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canUseApp,
  normalizeAccountStatus,
  type Profile,
  type UserRole,
} from "@/types/profile";
import {
  hasPermission,
  normalizeRole,
  type Permission,
} from "@/lib/permissions";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthProfile } from "@/lib/profile-auth";
import { listAuthUsersWithoutProfiles } from "@/lib/auth-registration";

const PROFILE_SELECT =
  "id, full_name, job_title, phone, role, account_status, email, created_at, updated_at";

const PROFILE_SELECT_LEGACY =
  "id, full_name, job_title, phone, role, created_at, updated_at";

function isMissingColumnError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("account_status") ||
    message.includes("email") ||
    message.includes("job_title") ||
    message.includes("role") ||
    message.includes("does not exist") ||
    message.includes("42703")
  );
}

type AdminProfileRow = {
  id: string;
  full_name: string;
  job_title?: string | null;
  phone: string;
  role?: string | null;
  account_status?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
};

/** 관리자 페이지: DB 마이그레이션 단계와 관계없이 사용자 목록 조회 */
export async function fetchAdminProfiles(supabase: SupabaseClient) {
  const full = await supabase
    .from("profiles")
    .select(
      "id, full_name, job_title, phone, role, account_status, email, created_at, updated_at",
    )
    .order("full_name", { ascending: true });

  if (!full.error && full.data) {
    return {
      profiles: full.data.map((row) => normalizeAdminProfileRow(row)),
      error: null as string | null,
      needsMigration: false,
    };
  }

  if (!isMissingColumnError(full.error?.message)) {
    return {
      profiles: [],
      error: full.error?.message ?? "사용자 목록을 불러오지 못했습니다.",
      needsMigration: false,
    };
  }

  const withRole = await supabase
    .from("profiles")
    .select("id, full_name, job_title, phone, role, created_at, updated_at")
    .order("full_name", { ascending: true });

  if (!withRole.error && withRole.data) {
    return {
      profiles: withRole.data.map((row) =>
        normalizeAdminProfileRow({ ...row, account_status: "active", email: null }),
      ),
      error: null,
      needsMigration: true,
    };
  }

  if (!isMissingColumnError(withRole.error?.message)) {
    return {
      profiles: [],
      error: withRole.error?.message ?? "사용자 목록을 불러오지 못했습니다.",
      needsMigration: false,
    };
  }

  const minimal = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at, updated_at")
    .order("full_name", { ascending: true });

  if (!minimal.error && minimal.data) {
    return {
      profiles: minimal.data.map((row) =>
        normalizeAdminProfileRow({
          ...row,
          job_title: null,
          role: "employee",
          account_status: "active",
          email: null,
        }),
      ),
      error: null,
      needsMigration: true,
    };
  }

  return {
    profiles: [],
    error: minimal.error?.message ?? "profiles 테이블을 찾을 수 없습니다.",
    needsMigration: false,
  };
}

function normalizeAdminProfileRow(
  row: AdminProfileRow,
  options?: { missingProfile?: boolean },
): Profile {
  return {
    id: row.id,
    full_name: row.full_name,
    job_title: row.job_title ?? null,
    phone: row.phone,
    role: normalizeRole(row.role),
    account_status: normalizeAccountStatus(row.account_status),
    email: row.email ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    missingProfile: options?.missingProfile ?? false,
  };
}

/** 관리자 페이지: profiles + auth만 있는 미연결 사용자 포함 */
export async function fetchAdminUserDirectory(supabase: SupabaseClient) {
  const base = await fetchAdminProfiles(supabase);
  const { users: orphanAuthUsers, serviceRoleMissing } =
    await listAuthUsersWithoutProfiles();

  if (!orphanAuthUsers.length) {
    return {
      ...base,
      orphanAuthCount: 0,
      serviceRoleMissing,
    };
  }

  const existingIds = new Set(base.profiles.map((profile) => profile.id));
  const orphanProfiles = orphanAuthUsers
    .filter((user) => user.id && !existingIds.has(user.id))
    .map((user) => {
      const metadata = user.user_metadata ?? {};
      const full_name =
        typeof metadata.full_name === "string" && metadata.full_name.trim()
          ? metadata.full_name.trim()
          : user.email?.split("@")[0] ?? "미등록";
      const phone =
        typeof metadata.phone === "string" && metadata.phone.trim()
          ? metadata.phone.trim()
          : "미등록";

      return normalizeAdminProfileRow(
        {
          id: user.id,
          full_name,
          job_title:
            typeof metadata.job_title === "string" ? metadata.job_title : null,
          phone,
          role: "employee",
          account_status: "pending_approval",
          email: user.email ?? null,
          created_at: user.created_at,
          updated_at: user.updated_at ?? user.created_at,
        },
        { missingProfile: true },
      );
    });

  const profiles = [...base.profiles, ...orphanProfiles].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "ko"),
  );

  return {
    profiles,
    error: base.error,
    needsMigration: base.needsMigration,
    orphanAuthCount: orphanProfiles.length,
    serviceRoleMissing: false,
  };
}

async function fetchProfileRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const extended = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!extended.error && extended.data) {
    return extended.data;
  }

  if (!isMissingColumnError(extended.error?.message)) {
    return null;
  }

  const legacy = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_LEGACY)
    .eq("id", userId)
    .maybeSingle();

  if (!legacy.data) return null;

  return {
    ...legacy.data,
    account_status: "active" as const,
    email: null,
  };
}

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

export const getCurrentUserProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const baseProfile = await fetchProfileRow(supabase, user.id);

  if (!baseProfile) return { user, profile: null };

  const profile: Profile = {
    ...baseProfile,
    role: normalizeRole(baseProfile.role),
    account_status: normalizeAccountStatus(baseProfile.account_status),
  };

  return { user, profile };
});

export function formatManagerDisplayName(
  fullName: string | null | undefined,
  jobTitle: string | null | undefined,
) {
  const name = fullName?.trim() ?? "";
  const title = jobTitle?.trim() ?? "";

  if (name && title) return `${name} ${title}`;
  return name || title;
}

export async function getModifierInfo() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    return { error: "로그인이 필요합니다." as const };
  }

  if (!canUseApp(profile)) {
    return {
      error: "계정 승인 후 이용할 수 있습니다." as const,
    };
  }

  return {
    userId: user.id,
    name: profile!.full_name,
    role: normalizeRole(profile!.role),
  };
}

export async function requirePermission(permission: Permission) {
  const modifier = await getModifierInfo();

  if ("error" in modifier) {
    return modifier;
  }

  const permissionMap = await getRolePermissionMap();
  if (!hasPermission(modifier.role, permission, permissionMap)) {
    return { error: "이 작업을 할 권한이 없습니다." as const };
  }

  return modifier;
}

export async function getUserRole(): Promise<UserRole> {
  const { profile } = await getCurrentUserProfile();
  return normalizeRole(profile?.role);
}
