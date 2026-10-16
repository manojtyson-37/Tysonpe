import type { Metadata } from "next";
import Link from "next/link";
import { Empty, TYPE_LABEL, dateFmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "My library" };

export default async function LibraryPage() {
  const user = await requireUser("/library");
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { creator: true, _count: { select: { items: true } } } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">My library</h1>
      <p className="mt-1 text-sm text-muted">Everything you&apos;ve bought, in one place.</p>
      <div className="mt-8">
        {enrollments.length === 0 ? (
          <Empty title="Your library is empty" body="When you buy a course, membership or download, it shows up here instantly." />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map(({ product: p, createdAt }) => (
              <li key={p.id}>
                <Link href={`/library/${p.id}`} className="card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="badge badge-muted self-start">{TYPE_LABEL[p.type] ?? p.type}</span>
                  <h2 className="mt-4 text-lg font-bold group-hover:text-brand">{p.title}</h2>
                  <p className="text-sm text-muted">by {p.creator.displayName}</p>
                  <p className="mt-auto pt-5 text-xs text-muted">{p._count.items} {p._count.items === 1 ? "lesson" : "lessons"} · Joined {dateFmt(createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
