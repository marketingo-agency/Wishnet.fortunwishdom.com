/**
 * File Settings Type
 * Shared type definition for file management settings.
 */

export interface FileSettings {
  id: string;
  max_file_size_mb: number;
  total_storage_quota_gb: number;
  allowed_file_types: string[] | null;
  auto_delete_trash_days: number | null;
  created_at: string;
  updated_at: string;
}
