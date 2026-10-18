export default function CrmLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-48 rounded-lg bg-surface-2" />
            <div className="h-5 w-32 rounded-full bg-emerald-100/60" />
          </div>
          <div className="h-4 w-72 rounded-md bg-surface-2/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-surface-2" />
          <div className="h-9 w-24 rounded-xl bg-surface-2" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-surface-2" />
            <div className="h-7 w-20 rounded-lg bg-surface-2" />
            <div className="h-3 w-24 rounded bg-surface-2/60" />
          </div>
        ))}
      </div>

      {/* Tab Bar Skeleton */}
      <div className="flex gap-4 border-b border-line pb-2">
        <div className="h-5 w-28 rounded bg-surface-2" />
        <div className="h-5 w-28 rounded bg-surface-2/60" />
        <div className="h-5 w-36 rounded bg-surface-2/60" />
        <div className="h-5 w-28 rounded bg-surface-2/60" />
      </div>

      {/* Split Inbox Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-line bg-surface overflow-hidden min-h-[580px]">
        {/* Left Column: Leads list */}
        <div className="lg:col-span-4 border-r border-line p-4 space-y-4">
          <div className="h-9 w-full rounded-xl bg-surface-2/60" />
          <div className="flex gap-2">
            <div className="h-6 w-12 rounded-lg bg-surface-2" />
            <div className="h-6 w-14 rounded-lg bg-surface-2/60" />
            <div className="h-6 w-16 rounded-lg bg-surface-2/60" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-line/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 rounded bg-surface-2" />
                  <div className="h-4 w-12 rounded-full bg-surface-2/60" />
                </div>
                <div className="h-3 w-44 rounded bg-surface-2/60" />
                <div className="h-3 w-32 rounded bg-surface-2/40" />
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: Chat Messages */}
        <div className="lg:col-span-5 border-r border-line p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="space-y-1">
              <div className="h-5 w-32 rounded bg-surface-2" />
              <div className="h-3 w-24 rounded bg-surface-2/60" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-surface-2" />
          </div>

          <div className="space-y-4 py-8">
            <div className="h-10 w-2/3 rounded-2xl bg-surface-2/60 self-start" />
            <div className="h-12 w-3/4 rounded-2xl bg-brand-soft/40 ml-auto" />
            <div className="h-10 w-1/2 rounded-2xl bg-surface-2/60 self-start" />
          </div>

          <div className="h-12 w-full rounded-xl bg-surface-2/50" />
        </div>

        {/* Right Column: Lead Metadata & Actions */}
        <div className="lg:col-span-3 p-5 space-y-4">
          <div className="h-4 w-24 rounded bg-surface-2" />
          <div className="h-12 w-full rounded-xl bg-surface-2/40" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-16 rounded bg-surface-2/60" />
            <div className="h-8 w-full rounded-lg bg-surface-2/40" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-20 rounded bg-surface-2/60" />
            <div className="h-8 w-full rounded-lg bg-surface-2/40" />
          </div>
          <div className="h-9 w-full rounded-xl bg-surface-2 mt-4" />
        </div>
      </div>
    </div>
  );
}
