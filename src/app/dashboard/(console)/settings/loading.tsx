export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-line/60 pb-5">
        <div className="h-7 w-36 rounded-lg bg-surface-2" />
        <div className="h-4 w-60 rounded-md bg-surface-2/60" />
      </div>

      {/* Banner Skeleton */}
      <div className="card max-w-xl p-5 border-line/80 bg-surface flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-44 rounded bg-surface-2" />
          <div className="h-3 w-64 rounded bg-surface-2/60" />
        </div>
        <div className="h-8 w-28 rounded-xl bg-surface-2" />
      </div>

      {/* Settings Form Skeleton */}
      <div className="card max-w-xl p-6 space-y-5">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-surface-2" />
          <div className="h-10 w-full rounded-xl bg-surface-2/60" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-12 rounded bg-surface-2" />
          <div className="h-20 w-full rounded-xl bg-surface-2/60" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-surface-2" />
          <div className="h-11 w-20 rounded-xl bg-surface-2/60" />
        </div>
        <div className="pt-4 border-t border-line space-y-4">
          <div className="h-4 w-36 rounded bg-surface-2" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-surface-2" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-36 rounded bg-surface-2" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
          </div>
        </div>
        <div className="h-10 w-28 rounded-xl bg-surface-2" />
      </div>
    </div>
  );
}
