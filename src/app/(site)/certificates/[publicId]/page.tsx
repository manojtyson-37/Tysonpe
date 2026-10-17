import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandScope } from "@/components/Brand";
import { PrintButton } from "@/components/PrintButton";
import { IconCheck } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

// Names of private individuals: keep out of search indexes.
export const metadata: Metadata = { title: "Certificate", robots: { index: false, follow: false } };

export default async function CertificatePage({ params }: PageProps<"/certificates/[publicId]">) {
  const { publicId } = await params;
  // Only the public fields are selected: never the learner's email.
  const cert = await db.certificate.findUnique({
    where: { publicId: publicId.toUpperCase() },
    select: {
      publicId: true, learnerName: true, courseTitle: true, creatorName: true, issuedAt: true, revokedAt: true,
      product: { select: { creator: { select: { brandColor: true } } } },
    },
  });
  if (!cert) notFound();

  if (cert.revokedAt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">This certificate is no longer valid</h1>
        <p className="mt-2 text-muted">Certificate <span className="font-mono">{cert.publicId}</span> was revoked.</p>
      </div>
    );
  }

  return (
    <BrandScope color={cert.product.creator.brandColor}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-good"><IconCheck size={16} /> Verified certificate</p>
          <PrintButton />
        </div>
        {/* The sheet: paper document, hairline inner frame, no resting shadow. The outer rule uses --brand-ring (>=3:1) so a pale creator colour still frames it. */}
        <article className="relative overflow-hidden rounded-card border-2 border-[color:var(--brand-ring)] bg-surface p-8 text-center sm:p-14 print:break-inside-avoid print:bg-white print:shadow-none">
          <div aria-hidden className="pointer-events-none absolute inset-3 rounded-control border border-line" />
          <div className="relative">
            {/* Logo has text-xl baked in; the child-selector variant outranks it by specificity, so no important flag is needed. */}
            <div className="[&>span]:text-base"><Logo className="justify-center opacity-70" /></div>
            <h1 className="t-label mt-8 font-sans tracking-widest">Certificate of completion</h1>
            <p className="mt-8 text-base text-muted">This certifies that</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-[color:var(--brand-text)] sm:text-5xl">{cert.learnerName}</h2>
            <p className="mt-6 text-base text-muted">has successfully completed</p>
            <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{cert.courseTitle}</h3>
            <p className="mt-6 text-base text-muted">taught by <strong className="text-ink">{cert.creatorName}</strong></p>
            <div className="mx-auto mt-10 flex max-w-md flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-sm text-muted">
              <span>Issued <span className="tabular-nums">{formatDate(cert.issuedAt, "long")}</span></span>
              <span>ID <span className="font-mono font-semibold tabular-nums text-ink">{cert.publicId}</span></span>
            </div>
          </div>
        </article>
        <p className="mt-4 text-center text-xs text-muted print:hidden">Anyone with this link can confirm the certificate is genuine.</p>
      </div>
    </BrandScope>
  );
}
