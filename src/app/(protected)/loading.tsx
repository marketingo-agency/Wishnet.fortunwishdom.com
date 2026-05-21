/**
 * Route-level loading skeleton for the (protected) group.
 * Renders a page-shaped skeleton instead of a bare spinner,
 * reducing perceived layout shift during navigation.
 */
export default function ProtectedLoading() {
  return (
    <div className="flex flex-col gap-6 h-full animate-pulse">
      {/* Title bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 rounded-xl bg-muted min-h-[200px]" />
    </div>
  );
}
