import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandScope } from "@/components/Brand";
import { PrintButton } from "@/components/PrintButton";
import { Logo } from "@/components/Logo";
import { db } from "@/lib/db";

// Names of private individuals: keep out of search indexes.
export const metadata: Metadata = { title: "Certificate", robots: { index: false, follow: false } };

const longDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }).format(d);

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
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-good"><span aria-hidden>✓</span> Verified certificate</p>
          <PrintButton />
        </div>
        <article className="relative overflow-hidden rounded-3xl border-2 border-brand bg-surface p-8 text-center sm:p-14 print:border-brand">
          <div aria-hidden className="pointer-events-none absolute inset-3 rounded-2xl border border-line" />
          <div className="relative">
            <Logo className="justify-center !text-base opacity-70" />
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-muted">Certificate of completion</p>
            <p className="mt-8 text-sm text-muted">This certifies that</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold text-brand sm:text-5xl">{cert.learnerName}</h1>
            <p className="mt-6 text-sm text-muted">has successfully completed</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{cert.courseTitle}</h2>
            <p className="mt-6 text-sm text-muted">taught by <strong className="text-ink">{cert.creatorName}</strong></p>
            <div className="mx-auto mt-10 flex max-w-md flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-xs text-muted">
              <span>Issued {longDate(cert.issuedAt)}</span>
              <span>ID <span className="font-mono font-semibold text-ink">{cert.publicId}</span></span>
            </div>
          </div>
        </article>
        <p className="mt-4 text-center text-xs text-muted print:hidden">Anyone with this link can confirm the certificate is genuine.</p>
      </div>
    </BrandScope>
  );
}
