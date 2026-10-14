"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createLimiter } from "@/lib/auth/rate-limit";
import { clearSession, getCurrentUser, safeNext, setSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { handleSchema } from "@/lib/handles";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

// Keyed by email (can't be dodged by rotating a spoofable X-Forwarded-For) plus a coarse per-IP bucket.
const loginByEmail = createLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
const loginByIp = createLimiter({ max: 60, windowMs: 15 * 60 * 1000 });
const signupByIp = createLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

/** Best-effort client IP. Only trustworthy behind a proxy that sets/overwrites these headers. */
async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim().slice(0, 64);
}

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
// Compared against when the email is unknown so response time doesn't reveal account existence.
const DUMMY_HASH = bcrypt.hashSync("tysonpe-dummy-password", 12);

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .refine((v) => Buffer.byteLength(v) <= 72, "Use at most 72 bytes (bcrypt limit)"),
  role: z.enum(["learner", "creator"]),
  handle: z.string().optional(),
});

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!signupByIp.hit(await clientIp())) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: flatten(parsed.error) };
  const { name, email, password, role } = parsed.data;

  let handle: string | null = null;
  if (role === "creator") {
    const h = handleSchema.safeParse(parsed.data.handle ?? "");
    if (!h.success) return { fields: { handle: h.error.issues[0].message } };
    handle = h.data;
    if (await db.creator.findUnique({ where: { handle } }))
      return { fields: { handle: "That handle is taken" } };
  }
  if (await db.user.findUnique({ where: { email } }))
    return { fields: { email: "An account with this email already exists" } };

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        ...(handle ? { creator: { create: { handle, displayName: name } } } : {}),
      },
    });
  } catch (e) {
    // Lost a race with a concurrent signup between the checks above and the insert.
    if (isUniqueViolation(e)) return { fields: { email: "An account with this email or handle already exists" } };
    throw e;
  }
  await setSession(user.id);
  redirect(safeNext(formData.get("next"), role === "creator" ? "/dashboard" : "/library"));
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!loginByIp.hit(await clientIp()) || !loginByEmail.hit(email.slice(0, 254)))
    return { error: "Too many attempts. Try again in a few minutes." };

  const user = await db.user.findUnique({ where: { email }, include: { creator: true } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Incorrect email or password." };

  loginByEmail.reset(email);
  await setSession(user.id);
  redirect(safeNext(formData.get("next"), user.creator ? "/dashboard" : "/library"));
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function becomeCreator(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/onboarding");
  if (user.creator) redirect("/dashboard");

  const h = handleSchema.safeParse(formData.get("handle"));
  if (!h.success) return { fields: { handle: h.error.issues[0].message } };
  if (await db.creator.findUnique({ where: { handle: h.data } }))
    return { fields: { handle: "That handle is taken" } };

  const displayName = String(formData.get("displayName") ?? user.name).trim().slice(0, 80) || user.name;
  try {
    await db.creator.create({ data: { userId: user.id, handle: h.data, displayName } });
  } catch (e) {
    if (isUniqueViolation(e)) return { fields: { handle: "That handle is taken" } };
    throw e;
  }
  redirect("/dashboard");
}
