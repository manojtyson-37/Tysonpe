import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, signSessionToken, verifySessionToken } from "./token";

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user (with creator profile) or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, preferredGateway: true, creator: true },
  });
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireCreator() {
  const user = await requireUser("/dashboard");
  if (!user.creator) redirect("/dashboard/onboarding");
  return { user, creator: user.creator };
}

export { safeNext } from "../safe-next";
