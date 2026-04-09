/**
 * Files Hook Types
 * Shared type definitions for file management
 */

export type FileType = 'all' | 'images' | 'videos' | 'audio' | 'documents';
export type FileView = 'all' | 'pinned' | 'trash';

export interface FileRecord {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  description: string | null;
  is_pinned: boolean;
  is_trashed: boolean;
  trashed_at: string | null;
  sector_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface FileTag {
  id: string;
  file_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  size: number;
  created_at: string;
}

export const getMimeTypeFilter = (type: FileType): string[] => {
  switch (type) {
    case 'images':
      return ['image/'];
    case 'videos':
      return ['video/'];
    case 'audio':
      return ['audio/'];
    case 'documents':
      return ['application/pdf', 'application/msword', 'application/vnd', 'text/'];
    default:
      return [];
  }
};
