export type UserRole = "admin" | "manager" | "employee";

export type AccountStatus = "pending_setup" | "pending_approval" | "active";

export type Profile = {
  id: string;
  full_name: string;
  job_title: string | null;
  phone: string;
  role: UserRole;
  account_status?: AccountStatus;
  email?: string | null;
  created_at: string;
  updated_at: string;
  /** profiles 테이블에 없고 auth 계정만 있는 사용자 */
  missingProfile?: boolean;
};

export function normalizeAccountStatus(
  value: string | null | undefined,
): AccountStatus {
  if (
    value === "pending_setup" ||
    value === "pending_approval" ||
    value === "active"
  ) {
    return value;
  }
  return "active";
}

export function isProfileComplete(
  profile: Pick<Profile, "full_name" | "job_title" | "phone"> | null | undefined,
) {
  if (!profile) return false;
  return Boolean(
    profile.full_name?.trim() &&
      profile.full_name.trim() !== "미등록" &&
      profile.phone?.trim() &&
      profile.phone.trim() !== "미등록",
  );
}

export function needsProfileSetup(
  profile:
    | Pick<Profile, "full_name" | "job_title" | "phone" | "account_status">
    | null
    | undefined,
) {
  if (!profile) return true;
  const status = normalizeAccountStatus(profile.account_status);
  if (status === "pending_setup") return true;
  if (status === "pending_approval") return false;
  return !isProfileComplete(profile);
}

export function needsAdminApproval(
  profile: Pick<Profile, "account_status"> | null | undefined,
) {
  return normalizeAccountStatus(profile?.account_status) === "pending_approval";
}

export function canUseApp(
  profile:
    | Pick<Profile, "full_name" | "job_title" | "phone" | "account_status">
    | null
    | undefined,
) {
  if (!profile) return false;
  const status = normalizeAccountStatus(profile.account_status);
  if (status !== "active") return false;
  return isProfileComplete(profile);
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending_setup: "정보 입력 대기",
  pending_approval: "승인 대기",
  active: "사용 중",
};
