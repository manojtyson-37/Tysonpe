import { Skeleton } from "@/components/ui";

// Mirrors the library page: same container, heading and one-line sub, and the same three-up card grid with a type
// pill, title, byline and a footer line. Six cards is two full rows at the widest layout. Static fills, no pulse.
function CardBlock() {
  return (
    <div className="card flex h-full flex-col p-6">
      <Skeleton className="h-5 w-20 self-start" />
      <Skeleton className="mt-4 h-6 w-4/5" />
      <Skeleton className="mt-2 h-4 w-2/5" />
      <div className="mt-auto pt-5">
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

export default function LibraryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <span role="status" className="sr-only">Loading your library</span>
      <div aria-hidden="true">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <CardBlock />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
