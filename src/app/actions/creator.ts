"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { slugify } from "@/lib/handles";
import { AppError, refundOrder } from "@/lib/orders";
import {
  GST_RATES,
  PRODUCT_TYPES,
  rupeesToPaise,
} from "@/lib/validation";
import type { FormState } from "./auth";

const fail = (e: z.ZodError): FormState => ({
  fields: Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message])),
});

/* ---------- Products ---------- */

const productSchema = z.object({
  title: z.string().trim().min(3, "Title needs 3+ characters").max(120),
  tagline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(10000).default(""),
  type: z.enum(PRODUCT_TYPES),
  price: rupeesToPaise.refine((p) => p === 0 || p >= 100, "Minimum price is ₹1 (or 0 for free)"),
  gstRatePct: z.coerce.number().refine((n) => (GST_RATES as readonly number[]).includes(n), "Invalid GST rate"),
  billing: z.enum(["one_time", "monthly"]),
});

async function uniqueSlug(creatorId: string, title: string, ignoreId?: string) {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await db.product.findUnique({ where: { creatorId_slug: { creatorId, slug } } });
    if (!hit || hit.id === ignoreId) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const p = productSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  const { price, ...rest } = p.data;
  const product = await db.product.create({
    data: { ...rest, pricePaise: price, creatorId: creator.id, slug: await uniqueSlug(creator.id, rest.title) },
  });
  redirect(`/dashboard/products/${product.id}`);
}

export async function updateProduct(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const p = productSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  const { price, ...rest } = p.data;
  const res = await db.product.updateMany({
    where: { id, creatorId: creator.id },
    data: { ...rest, pricePaise: price },
  });
  if (res.count === 0) return { error: "Product not found." };
  revalidatePath(`/dashboard/products/${id}`);
  return { error: undefined, fields: { saved: "1" } };
}

/** Unpublish only. Publishing must go through publishProduct (curriculum.ts), which validates quizzes. */
export async function unpublishProduct(id: string) {
  const { creator } = await requireCreator();
  await db.product.updateMany({ where: { id, creatorId: creator.id }, data: { status: "draft" } });
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
}

export async function deleteProduct(id: string) {
  const { creator } = await requireCreator();
  const product = await db.product.findFirst({
    where: { id, creatorId: creator.id },
    include: { _count: { select: { orders: true } } },
  });
  if (!product) return;
  if (product._count.orders > 0) {
    // Orders reference the product, so history is preserved: unpublish instead of deleting.
    await db.product.update({ where: { id }, data: { status: "draft" } });
  } else {
    await db.product.delete({ where: { id } });
  }
  redirect("/dashboard/products");
}

/* ---------- Coupons ---------- */

const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, "3–20 chars: A–Z, 0–9, - _"),
    kind: z.enum(["percent", "flat"]),
    percent: z.string().optional(),
    flat: z.string().optional(),
    maxRedemptions: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .transform((v, ctx) => {
    let percentOff: number | null = null;
    let flatOffPaise: number | null = null;
    if (v.kind === "percent") {
      const n = Number(v.percent);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        ctx.addIssue({ code: "custom", path: ["percent"], message: "Enter a whole number 1–100" });
        return z.NEVER;
      }
      percentOff = n;
    } else {
      const r = rupeesToPaise.safeParse(v.flat ?? "");
      if (!r.success || r.data < 100) {
        ctx.addIssue({ code: "custom", path: ["flat"], message: "Enter an amount of ₹1 or more" });
        return z.NEVER;
      }
      flatOffPaise = r.data;
    }
    let maxRedemptions: number | null = null;
    if (v.maxRedemptions) {
      const m = Number(v.maxRedemptions);
      if (!Number.isInteger(m) || m < 1) {
        ctx.addIssue({ code: "custom", path: ["maxRedemptions"], message: "Whole number, 1 or more" });
        return z.NEVER;
      }
      maxRedemptions = m;
    }
    let expiresAt: Date | null = null;
    if (v.expiresAt) {
      // Valid through the end of the chosen day (IST).
      expiresAt = new Date(`${v.expiresAt}T23:59:59+05:30`);
      if (Number.isNaN(expiresAt.getTime())) {
        ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Invalid date" });
        return z.NEVER;
      }
    }
    return { code: v.code, percentOff, flatOffPaise, maxRedemptions, expiresAt };
  });

export async function createCoupon(_prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const p = couponSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  if (await db.coupon.findUnique({ where: { creatorId_code: { creatorId: creator.id, code: p.data.code } } }))
    return { fields: { code: "You already have this code" } };
  await db.coupon.create({ data: { ...p.data, creatorId: creator.id } });
  revalidatePath("/dashboard/coupons");
  return undefined;
}

export async function updateCoupon(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const p = couponSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  const clash = await db.coupon.findFirst({
    where: { creatorId: creator.id, code: p.data.code, NOT: { id } },
  });
  if (clash) return { fields: { code: "You already have this code" } };
  const res = await db.coupon.updateMany({ where: { id, creatorId: creator.id }, data: p.data });
  if (res.count === 0) return { error: "Coupon not found." };
  revalidatePath("/dashboard/coupons");
  return { fields: { saved: "1" } };
}

export async function setCouponActive(id: string, active: boolean) {
  const { creator } = await requireCreator();
  const safe = z.boolean().parse(active);
  await db.coupon.updateMany({ where: { id, creatorId: creator.id }, data: { active: safe } });
  revalidatePath("/dashboard/coupons");
}

export async function deleteCoupon(id: string) {
  const { creator } = await requireCreator();
  const c = await db.coupon.findFirst({
    where: { id, creatorId: creator.id },
    include: { _count: { select: { orders: true } } },
  });
  if (!c) return;
  if (c._count.orders > 0) await db.coupon.update({ where: { id }, data: { active: false } });
  else await db.coupon.delete({ where: { id } });
  revalidatePath("/dashboard/coupons");
}

/* ---------- Profile ---------- */

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter a name").max(80),
  bio: z.string().trim().max(600).default(""),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
});

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  await db.creator.update({ where: { id: creator.id }, data: p.data });
  revalidatePath("/dashboard/settings");
  revalidatePath(`/c/${creator.handle}`);
  return { fields: { saved: "1" } };
}

/* ---------- Orders ---------- */

export async function refundOrderAction(orderId: string) {
  const { creator } = await requireCreator();
  try {
    await refundOrder({ creatorId: creator.id, orderId });
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    redirect(`/dashboard/orders?error=${encodeURIComponent(e.message)}`);
  }
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}
