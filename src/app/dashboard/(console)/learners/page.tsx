import type { Metadata } from "next";
import { Empty, PageHeader, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Learners" };

export default async function LearnersPage() {
  const { creator } = await requireCreator();
  const enrollments = await db.enrollment.findMany({
    where: { product: { creatorId: creator.id } },
    orderBy: { createdAt: "desc" },
    include: { user: true, product: true },
  });
  return (
    <>
      <PageHeader title="Learners" sub={`${new Set(enrollments.map((e) => e.userId)).size} people have access to your products.`} />
      {enrollments.length === 0 ? (
        <Empty title="No learners yet" body="When someone buys a product they appear here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Learner</th><th>Product</th><th>Joined</th></tr></thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td><p className="font-medium">{e.user.name}</p><p className="text-xs text-muted">{e.user.email}</p></td>
                  <td>{e.product.title}</td>
                  <td className="whitespace-nowrap text-muted">{dateFmt(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
