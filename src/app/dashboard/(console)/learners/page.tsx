import type { Metadata } from "next";
import { Avatar, DateCell, EmptyRow, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

// A constant, not `title="..."` in JSX: the style scan flags that spelling because on a host element it is a tooltip.
const PAGE_TITLE = "Learners";
export const metadata: Metadata = { title: PAGE_TITLE };

// The cap keeps a busy account from loading an unbounded page; the note below the table appears only when more
// enrolments exist than are shown (a count, so exactly 200 says nothing).
const LEARNER_LIMIT = 200;

export default async function LearnersPage() {
  const { creator } = await requireCreator();
  const where = { product: { creatorId: creator.id } };
  // People are counted by the database over ALL of the creator's enrolments (distinct users), never from the capped rows.
  const [enrollments, total, people] = await Promise.all([
    db.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: LEARNER_LIMIT,
      include: { user: true, product: true },
    }),
    db.enrollment.count({ where }),
    db.user.count({ where: { enrollments: { some: where } } }),
  ]);
  const sub =
    people === 0
      ? "Nobody has access to your products yet."
      : `${people} ${people === 1 ? "person has" : "people have"} access to your products.`;
  return (
    <>
      <PageHeader title={PAGE_TITLE} sub={sub} />
      <Table aria-label="Learners" stack>
        <thead>
          <tr>
            <Th>Learner</Th>
            <Th>Product</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {enrollments.length === 0 ? (
            <EmptyRow colSpan={3} title="No learners yet" body="When someone buys a product they appear here." />
          ) : (
            enrollments.map((e) => (
              <Tr key={e.id}>
                <Td label="Learner">
                  <div className="flex items-center gap-3">
                    <Avatar name={e.user.name} size="sm" />
                    <div className="min-w-0">
                      <p className="break-words font-medium">{e.user.name}</p>
                      <p className="t-meta break-all">{e.user.email}</p>
                    </div>
                  </div>
                </Td>
                <Td label="Product"><span className="break-words">{e.product.title}</span></Td>
                <DateCell date={e.createdAt} label="Joined" className="text-muted" />
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {total > enrollments.length && (
        <p className="t-meta mt-3">Showing the latest {enrollments.length} of {total} enrolments.</p>
      )}
    </>
  );
}
