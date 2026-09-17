export type CompanyDocument = {
  id: string;
  title: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  expires_at: string | null;
  note: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export const COMPANY_DOCUMENT_SELECT =
  "id, title, file_name, storage_path, mime_type, file_size, expires_at, note, created_by_user_id, created_by_name, created_at, updated_at";
