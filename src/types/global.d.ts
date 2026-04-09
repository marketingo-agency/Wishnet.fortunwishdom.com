/**
 * Project-wide global type augmentations.
 * Replaces the deleted Vite-era src/vite-env.d.ts.
 */
export {};

declare global {
  interface Window {
    /** Loaded dynamically via CDN script tag in src/components/osha/OshaMessageBubble.tsx */
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, code: string) => Promise<{ svg: string }>;
    };
  }
}
