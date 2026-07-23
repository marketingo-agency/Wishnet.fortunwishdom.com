/**
 * Hooks Barrel Export
 * Re-exports commonly used hooks for cleaner imports.
 */

// Chat utilities
export { useCopyToClipboard, useScrollToBottom, useAutoResizeTextarea, useEnterToSend } from './useChatUtils';

// Controller hooks
export { useOshaChatController } from './useOshaChatController';

// Auth
export { useAuth } from '@/contexts/AuthContext';
