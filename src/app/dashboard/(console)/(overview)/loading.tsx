import { Skeleton, SkeletonAvatar } from "@/components/ui";

// Replaces only the console <main> content: the layout keeps the bar, sidebar and drawer. The shape mirrors the
// Overview (header with one action, four stats, the 14-day chart card, a checklist card beside a six-row list),
// the page most often landed on. Static fills, no pulse. The blocks are aria-hidden, so the one status line is
// the only thing announced.
function StatBlock() {
  return (
    <div>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2.5 h-8 w-28" />
      <Skeleton className="mt-2 h-3 w-36" />
    </div>
  );
}

function OrderRow() {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-1.5 h-3 w-2/5" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function StepRow() {
  return (
    <div className="flex items-center gap-3">
      <SkeletonAvatar size={20} />
      <Skeleton className="h-4 w-48 max-w-full" />
    </div>
  );
}

export default function ConsoleLoading() {
  return (
    <>
      <span role="status" className="sr-only">Loading this page</span>
      <div aria-hidden="true">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2.5 h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatBlock key={i} />
          ))}
        </div>

        <div className="card mt-6 p-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-5 h-36 w-full" />
          <div className="mt-2 flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <Skeleton className="h-5 w-24" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <StepRow key={i} />
              ))}
            </div>
            <Skeleton className="mt-5 h-3 w-24" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="mt-3 divide-y divide-line">
              {Array.from({ length: 6 }, (_, i) => (
                <OrderRow key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
