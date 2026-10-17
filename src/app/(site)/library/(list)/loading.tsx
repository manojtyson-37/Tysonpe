import { Skeleton } from "@/components/ui";

// Mirrors the library page: same container, heading and one-line sub, then a ruled list of rows, each with a title,
// two meta lines and a progress bar on the right. Static fills, no pulse.
function RowBlock() {
  return (
    <div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="mt-2 h-4 w-2/5" />
        <Skeleton className="mt-2 h-4 w-1/3" />
      </div>
      <Skeleton className="h-1.5 w-full sm:w-64 sm:shrink-0" />
    </div>
  );
}

export default function LibraryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <span role="status" className="sr-only">Loading your library</span>
      <div aria-hidden="true">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2.5 mb-6 h-4 w-72 max-w-full" />
        <ul className="divide-y divide-line border-y border-line">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i}>
              <RowBlock />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
