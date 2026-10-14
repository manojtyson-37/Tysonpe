import { randomInt } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { computeProgress } from "./progress";

type Tx = Prisma.TransactionClient;

// No I, O, 0, 1: public ids get read aloud and typed from printouts.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newPublicId = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/**
 * Issue (or restore) the learner's certificate if the product has them on and every required lesson is done.
 * Returns "issued" | "restored" | "exists" | "none".
 */
export async function maybeIssueCertificate(tx: Tx, userId: string, productId: string) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    include: { creator: true, items: { select: { id: true, requiredForCompletion: true } } },
  });
  if (!product?.certificateEnabled) return "none" as const;
  const enrolled = await tx.enrollment.findUnique({ where: { userId_productId: { userId, productId } } });
  if (!enrolled) return "none" as const;

  const done = await tx.lessonProgress.findMany({ where: { userId, productId }, select: { itemId: true } });
  const progress = computeProgress(
    product.items.map((i) => ({ id: i.id, required: i.requiredForCompletion })),
    new Set(done.map((d) => d.itemId)),
  );
  if (!progress.complete) return "none" as const;

  const existing = await tx.certificate.findUnique({ where: { userId_productId: { userId, productId } } });
  if (existing) {
    if (existing.revokedAt === null) return "exists" as const;
    await tx.certificate.update({ where: { id: existing.id }, data: { revokedAt: null } });
    return "restored" as const;
  }
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  // Upsert (INSERT … ON CONFLICT) instead of create-and-catch: a caught unique violation would abort the
  // whole transaction on Postgres. If a concurrent issuer won, its row is returned untouched.
  const mine = newPublicId();
  const cert = await tx.certificate.upsert({
    where: { userId_productId: { userId, productId } },
    create: { publicId: mine, userId, productId, learnerName: user.name, courseTitle: product.title, creatorName: product.creator.displayName },
    update: {},
  });
  return cert.publicId === mine ? ("issued" as const) : ("exists" as const);
}

/** Turning certificates on later: award them to learners who already finished. Returns newly issued count. */
export async function backfillCertificates(productId: string) {
  const enrollments = await db.enrollment.findMany({ where: { productId }, select: { userId: true } });
  let issued = 0;
  for (const e of enrollments) {
    const r = await db.$transaction((tx) => maybeIssueCertificate(tx, e.userId, productId));
    if (r === "issued") issued++;
  }
  return issued;
}

/** After a refund: if the buyer no longer has access through any paid order, the certificate is revoked. */
export async function revokeIfNoAccess(tx: Tx, userId: string, productId: string) {
  const stillEnrolled = await tx.enrollment.count({ where: { userId, productId } });
  if (stillEnrolled > 0) return;
  await tx.certificate.updateMany({ where: { userId, productId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/**
 * After the creator edits the curriculum (deletes a lesson, makes one optional): learners who are now
 * done have nothing left to click, so nothing would ever issue their certificate. Re-check everyone.
 */
export async function onCurriculumChanged(productId: string) {
  const p = await db.product.findUnique({ where: { id: productId }, select: { certificateEnabled: true } });
  return p?.certificateEnabled ? backfillCertificates(productId) : 0;
}
