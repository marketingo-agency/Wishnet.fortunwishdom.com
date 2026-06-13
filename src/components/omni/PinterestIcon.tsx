/**
 * Pinterest brand glyph. lucide-react 0.462 ships a `Youtube` icon but not
 * `Pinterest`, so this inline SVG matches the lucide rendering contract
 * (single-color `currentColor`, sized via className) used by OmniNetworkDef.
 */
export function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.807 1.48 1.807 1.776 0 3.142-1.873 3.142-4.576 0-2.393-1.72-4.066-4.176-4.066-2.845 0-4.515 2.134-4.515 4.34 0 .859.331 1.781.744 2.281a.3.3 0 0 1 .069.288c-.076.315-.245.995-.278 1.134-.043.183-.145.222-.334.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.472 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  );
}
