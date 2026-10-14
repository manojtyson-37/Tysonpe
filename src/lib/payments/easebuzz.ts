import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./types";

export type EasebuzzEnv = "test" | "prod";

const HOSTS: Record<EasebuzzEnv, string> = {
  test: "https://testpay.easebuzz.in",
  prod: "https://pay.easebuzz.in",
};

const sha512 = (s: string) => createHash("sha512").update(s).digest("hex");

/** Easebuzz wants rupees as a 2-decimal string ("1180.00"); we store integer paise. */
export function formatAmount(paise: number): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

type HashFields = Record<string, string | undefined>;
const v = (f: HashFields, k: string) => (f[k] ?? "").trim();

/** Initiate-payment hash: key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt. */
export function requestHash(f: HashFields, salt: string): string {
  const udfs = Array.from({ length: 10 }, (_, i) => v(f, `udf${i + 1}`));
  return sha512(
    [v(f, "key"), v(f, "txnid"), v(f, "amount"), v(f, "productinfo"), v(f, "firstname"), v(f, "email"), ...udfs, salt].join("|"),
  );
}

/**
 * Callback/webhook hash, the request sequence reversed:
 * [additional_charges|]salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key.
 */
export function responseHash(f: HashFields, salt: string): string {
  const udfs = Array.from({ length: 10 }, (_, i) => v(f, `udf${10 - i}`));
  const seq = [salt, v(f, "status"), ...udfs, v(f, "email"), v(f, "firstname"), v(f, "productinfo"), v(f, "amount"), v(f, "txnid"), v(f, "key")];
  const extra = v(f, "additional_charges");
  if (extra) seq.unshift(extra);
  return sha512(seq.join("|"));
}

/** Constant-time check of the gateway's hash. False (never throws) on any malformed input. */
export function verifyEasebuzzCallback(fields: HashFields, salt: string): boolean {
  const given = v(fields, "hash").toLowerCase();
  if (!salt || !/^[0-9a-f]{128}$/.test(given)) return false;
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(responseHash(fields, salt), "hex"));
}

/** Easebuzz refuses a reused txnid, so every payment attempt gets a fresh one: `<orderId>-<4 hex>` (exactly 40 chars). */
export const attemptTxnid = (providerOrderId: string) => `${providerOrderId}-${randomBytes(2).toString("hex")}`;
/** Map a callback txnid (with or without an attempt suffix) back to the order's providerOrderId. */
export const orderIdFromTxnid = (txnid: string) => txnid.replace(/-[0-9a-f]{4}$/, "");

/** Exact "1180.00"-style rupees to integer paise; null for anything else (no floats, no exponents). */
export function rupeesToPaise(s: string | undefined): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec((s ?? "").trim());
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
}

export type InitiateInput = {
  txnid: string;
  amountPaise: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
};

/**
 * Easebuzz is redirect-based: we mint the transaction id locally, then at pay time exchange a signed
 * request for a one-off access key and send the buyer to the hosted page. The verified callback
 * (see handleEasebuzzCallback in orders.ts) is the only thing that can mark an order paid.
 */
export class EasebuzzProvider implements PaymentProvider {
  readonly name = "easebuzz" as const;
  readonly publicKey = null;

  constructor(
    private key: string,
    private salt: string,
    private env: EasebuzzEnv,
  ) {}

  async createOrder() {
    return { providerOrderId: `eb_${randomUUID().replace(/-/g, "")}` };
  }

  async initiatePayment(i: InitiateInput): Promise<{ payUrl: string }> {
    const host = HOSTS[this.env];
    const body: Record<string, string> = {
      key: this.key,
      txnid: i.txnid,
      amount: formatAmount(i.amountPaise),
      productinfo: i.productinfo,
      firstname: i.firstname,
      email: i.email,
      phone: i.phone,
      surl: i.surl,
      furl: i.furl,
    };
    body.hash = requestHash(body, this.salt);

    const res = await fetch(`${host}/payment/initiateLink`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { status?: number; data?: unknown } | null;
    if (!res.ok || json?.status !== 1 || typeof json.data !== "string")
      throw new Error(`Easebuzz rejected the payment request: ${typeof json?.data === "string" ? json.data : `HTTP ${res.status}`}`);
    if (!/^[A-Za-z0-9]+$/.test(json.data)) throw new Error("Easebuzz returned an unexpected access key.");
    return { payUrl: `${host}/pay/${encodeURIComponent(json.data)}` };
  }

  verifyCallback(fields: HashFields): boolean {
    return fields.key === this.key && verifyEasebuzzCallback(fields, this.salt);
  }

  // Razorpay-style checks don't exist here; failing closed keeps confirmPayment/handleWebhook safe.
  verifyPayment() {
    return false;
  }
  verifyWebhook() {
    return false;
  }
}
