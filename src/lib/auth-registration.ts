import type { AuthError, User } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTTLCache } from "@/lib/ttl-cache";

const orphanAuthUserCache = createTTLCache<{
  users: User[];
  serviceRoleMissing: boolean;
}>();
const ORPHAN_AUTH_USER_CACHE_TTL_MS = 5 * 60_000;

export function invalidateOrphanAuthUserCache() {
  orphanAuthUserCache.invalidate();
}

export type RegistrationProfilePayload = {
  id: string;
  full_name: string;
  phone: string;
  job_title: string;
  role: "employee";
  account_status: "pending_approval";
  email: string;
  updated_at: string;
};

export function getSignUpRedirectUrl() {
  return `${getAppUrl()}/auth/callback`;
}

export function mapSignUpError(error: AuthError) {
  const message = error.message.toLowerCase();

  if (
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return "이미 등록된 이메일입니다. 로그인해 주세요.";
  }

  if (message.includes("invalid email")) {
    return "올바른 이메일 형식을 입력해 주세요.";
  }

  if (message.includes("password")) {
    return "비밀번호가 정책에 맞지 않습니다. 8자 이상으로 다시 설정해 주세요.";
  }

  if (message.includes("signup") && message.includes("disabled")) {
    return "현재 회원가입이 비활성화되어 있습니다. Supabase에서 Email Signup을 켜 주세요.";
  }

  if (message.includes("rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (message.includes("redirect") || message.includes("url")) {
    return "배포 URL 설정 오류입니다. Supabase Redirect URLs에 배포 주소를 추가해 주세요.";
  }

  return `회원가입에 실패했습니다. (${error.message})`;
}

export function isDuplicateSignUpResponse(user: User | null) {
  return !user || user.identities == null || user.identities.length === 0;
}

async function listAllAuthUsers() {
  const adminClient = createAdminClient();
  const users = [];
  let page = 1;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error || !data?.users?.length) {
      break;
    }

    users.push(...data.users);

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return users;
}

export function profileFromAuthUser(user: User): RegistrationProfilePayload {
  const metadata = user.user_metadata ?? {};
  const full_name =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : user.email?.split("@")[0] ?? "미등록";
  const phone =
    typeof metadata.phone === "string" && metadata.phone.trim()
      ? metadata.phone.trim()
      : "미등록";

  return {
    id: user.id,
    full_name,
    phone,
    job_title: "",
    role: "employee",
    account_status: "pending_approval",
    email: user.email?.toLowerCase() ?? "",
    updated_at: new Date().toISOString(),
  };
}

async function findAuthUserByEmail(email: string) {
  const adminClient = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error || !data?.users?.length) {
      return null;
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }

  return null;
}

export async function recoverPendingRegistrationProfile(
  email: string,
  profilePayload: RegistrationProfilePayload,
) {
  const adminClient = createAdminClient();
  const existingUser = await findAuthUserByEmail(email);

  if (!existingUser) {
    return null;
  }

  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, account_status")
    .eq("id", existingUser.id)
    .maybeSingle();

  if (existingProfile) {
    return {
      error:
        "이미 등록된 이메일입니다. 로그인해 주세요. 가입 확인 메일을 받으셨다면 메일 인증 후 로그인해 주세요.",
    } as const;
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    ...profilePayload,
    id: existingUser.id,
  });

  if (profileError) {
    const detail = profileError.message.toLowerCase();
    if (detail.includes("account_status") || detail.includes("column")) {
      return {
        error:
          "프로필 저장에 실패했습니다. Supabase SQL Editor에서 supabase/schema-admin-settings.sql을 실행해 주세요.",
      } as const;
    }

    return {
      error:
        "프로필 저장에 실패했습니다. Supabase에서 schema-admin-settings.sql 실행 여부와 Vercel의 SUPABASE_SERVICE_ROLE_KEY 설정을 확인해 주세요.",
    } as const;
  }

  if (!existingUser.email_confirmed_at) {
    return {
      success:
        "이미 가입된 이메일입니다. 가입 확인 메일을 확인한 뒤 관리자 승인을 기다려 주세요. 인증 후 사용 가능합니다.",
    } as const;
  }

  return {
    success:
      "등록이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다. 인증 후 사용 가능합니다.",
  } as const;
}

export async function saveRegistrationProfile(
  profilePayload: RegistrationProfilePayload,
) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("profiles").upsert(profilePayload);
  return error;
}

export async function listAuthUsersWithoutProfiles(): Promise<{
  users: User[];
  serviceRoleMissing: boolean;
}> {
  const cached = orphanAuthUserCache.get();
  if (cached) {
    return cached;
  }

  try {
    const adminClient = createAdminClient();
    const authUsers = await listAllAuthUsers();
    const { data: profiles } = await adminClient.from("profiles").select("id");
    const profileIds = new Set((profiles ?? []).map((row) => row.id));

    const result = {
      users: authUsers.filter((user) => user.id && !profileIds.has(user.id)),
      serviceRoleMissing: false,
    };
    orphanAuthUserCache.set(result, ORPHAN_AUTH_USER_CACHE_TTL_MS);
    return result;
  } catch {
    const result = { users: [], serviceRoleMissing: true };
    orphanAuthUserCache.set(result, ORPHAN_AUTH_USER_CACHE_TTL_MS);
    return result;
  }
}
