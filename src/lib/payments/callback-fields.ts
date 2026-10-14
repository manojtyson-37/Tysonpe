const MAX_BODY_BYTES = 64 * 1024;

/** Read at most MAX_BODY_BYTES; null when the body is larger (stops chunked uploads without content-length). */
async function readCapped(req: Request): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let r: ReadableStreamReadResult<Uint8Array>;
    try {
      r = await reader.read();
    } catch {
      return null; // aborted mid-body: treat as unusable
    }
    if (r.done) break;
    total += r.value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(r.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Easebuzz posts form-encoded fields (the webhook may also send JSON). Flatten to strings and cap the body:
 * these endpoints are unauthenticated. Non-string JSON values are dropped (a re-serialised number would
 * never match the signed text), so a payload that depends on them fails the hash check closed.
 */
export async function readCallbackFields(req: Request): Promise<Record<string, string>> {
  const raw = await readCapped(req);
  if (raw === null) return {};

  const out: Record<string, string> = {};
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return {};
    }
    if (body && typeof body === "object")
      for (const [k, v] of Object.entries(body)) if (typeof v === "string") out[k] = v;
    return out;
  }
  for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
  return out;
}
