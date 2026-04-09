/**
 * useFiles Hook - Backward Compatibility Re-export
 * 
 * This file maintains backward compatibility for existing imports.
 * All functionality has been split into domain-specific modules in ./files/
 * 
 * New code should import directly from '@/hooks/files' instead.
 */

// Re-export everything from the new modular structure
export * from './files';
