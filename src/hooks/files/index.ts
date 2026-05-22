/**
 * Files Hooks Barrel Export
 * Re-exports all file management hooks and utilities
 */

// Types
export type { FileType, FileView, FileRecord, Sector, FileTag, FileVersion } from './types';
export { getMimeTypeFilter } from './types';

// URL utilities
export { getFileUrl, getSignedFileUrl, getSecureFileUrl, fetchSecureFile, getBrainDocumentUrl, extractFilesStoragePath } from './fileUrls';
export { useSecureImageUrl } from './useSecureImageUrl';

// Core file operations
export { useFiles, useUploadFile, useUpdateFile, useDeleteFile } from './useFilesCore';

// Sectors (folders)
export { useSectors, useCreateSector, useUpdateSector, useDeleteSector } from './useSectors';

// Tags
export { useFileTags, useAddTag, useRemoveTag } from './useTags';

// Versions
export { useFileVersions } from './useVersions';

// Storage
export { useStorageUsage } from './useStorage';

// Brain document integration
export {
  useGetOrCreateBrainFolder,
  useCreateLinkedFile,
  useBrainDocumentsAsFiles,
  useBrainKnowledgeSector,
} from './useBrainBridge';
