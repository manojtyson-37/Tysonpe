import Link from "next/link";
import type { ReactNode } from "react";
import { formatINR } from "@/lib/money";

export const Money = ({ paise }: { paise: number }) => <>{formatINR(paise)}</>;

const statusStyle: Record<string, string> = {
  paid: "badge-good", published: "badge-good", active: "badge-good",
  created: "badge-warn", draft: "badge-muted", failed: "badge-bad",
  refunded: "badge-bad", inactive: "badge-muted",
  pending_approval: "badge-warn", pending_verification: "badge-warn",
};
const statusLabel: Record<string, string> = {
  pending_approval: "Awaiting Verification",
  pending_verification: "Awaiting Verification",
  created: "pending",
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`badge ${statusStyle[status] ?? "badge-muted"}`}>{statusLabel[status] ?? status}</span>
);

export const TYPE_LABEL: Record<string, string> = {
  course: "Course", membership: "Membership", webinar: "Live webinar",
  download: "Digital download", consultation: "1:1 consultation",
};

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {cta && <Link href={cta.href} className="btn btn-primary mt-5">{cta.label}</Link>}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export const dateFmt = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d) : "—";
