export type UserRole = "admin" | "manager" | "employee";

export type Profile = {
  id: string;
  full_name: string;
  job_title: string | null;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export function isProfileComplete(
  profile: Pick<Profile, "full_name" | "job_title" | "phone"> | null | undefined,
) {
  if (!profile) return false;
  return Boolean(
    profile.full_name?.trim() &&
      profile.job_title?.trim() &&
      profile.phone?.trim(),
  );
}
