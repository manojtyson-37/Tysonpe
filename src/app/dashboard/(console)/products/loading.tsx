export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg bg-surface-2" />
          <div className="h-4 w-48 rounded-md bg-surface-2/60" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-surface-2" />
      </div>

      {/* Table Skeleton */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line/60 flex justify-between">
          <div className="h-4 w-28 rounded bg-surface-2" />
          <div className="h-4 w-16 rounded bg-surface-2" />
        </div>
        <div className="divide-y divide-line/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="h-4 w-44 rounded bg-surface-2" />
                <div className="h-3 w-24 rounded bg-surface-2/60" />
              </div>
              <div className="h-4 w-20 rounded bg-surface-2/60" />
              <div className="h-4 w-16 rounded bg-surface-2/60" />
              <div className="h-4 w-12 rounded bg-surface-2/60" />
              <div className="h-6 w-20 rounded-full bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
