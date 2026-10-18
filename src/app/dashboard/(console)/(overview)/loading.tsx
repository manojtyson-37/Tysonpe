import { Skeleton, SkeletonAvatar } from "@/components/ui";
import { stripLayout } from "@/components/ui/stat";

const STRIP = stripLayout(4);

// Replaces only the console <main> content: the layout keeps the bar, sidebar and drawer. The shape mirrors the
// Overview (header with one action, store link row, a ruled four-stat strip, the 14-day chart, the setup checklist,
// then six order rows, all full width in one column), the page most often landed on. Ruled with hairlines like the page, not boxed in cards.
// Static fills, no pulse. The blocks are aria-hidden, so the one status line is the only thing announced.
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
    <div className="flex items-center justify-between gap-3 py-3">
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
    <div className="flex items-center gap-3 py-3">
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

        <div className="-mt-2 mb-6 max-w-md">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-9 w-full" />
        </div>

        <div className="@container">
          <div className={STRIP.grid}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={STRIP.cell(i)}>
                <StatBlock />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>

        <div className="mt-10">
          <Skeleton className="h-5 w-24" />
          <div className="mt-3 divide-y divide-line border-y border-line">
            {Array.from({ length: 3 }, (_, i) => (
              <StepRow key={i} />
            ))}
          </div>
        </div>

        <div className="mt-10">
          <Skeleton className="h-5 w-28" />
          <div className="mt-3 divide-y divide-line border-y border-line">
            {Array.from({ length: 6 }, (_, i) => (
              <OrderRow key={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
