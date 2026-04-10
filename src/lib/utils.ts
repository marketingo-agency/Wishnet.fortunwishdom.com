import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a file name for use in storage paths.
 * Removes special characters, keeps alphanumeric, dash, underscore, and dot.
 */
export function sanitizeFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot > 0 ? fileName.slice(lastDot) : '';
  const nameWithoutExt = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  
  const sanitized = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  const finalName = sanitized || 'file';
  
  return finalName + ext.toLowerCase();
}

/**
 * Escape special characters for PostgREST .ilike filters.
 * Prevents user input from being interpreted as wildcard patterns.
 */
export function escapePostgrestSearch(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
