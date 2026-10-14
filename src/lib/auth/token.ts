import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "tp_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

const PLACEHOLDER_SECRET = /^(dev-only|generate-|change-?me|secret$)/i;

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET must be set.");
  if (process.env.NODE_ENV === "production" && (s.length < 32 || PLACEHOLDER_SECRET.test(s))) {
    throw new Error("SESSION_SECRET must be a random value of at least 32 characters in production (not a placeholder).");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
