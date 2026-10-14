import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getEasebuzzProvider, getProvider, type PaymentProvider } from "./index";
import {
  EasebuzzProvider,
  attemptTxnid,
  formatAmount,
  orderIdFromTxnid,
  requestHash,
  rupeesToPaise,
  responseHash,
  verifyEasebuzzCallback,
} from "./easebuzz";

const KEY = "testkey";
const SALT = "testsalt";
const sha = (s: string) => createHash("sha512").update(s).digest("hex");

const params = {
  key: KEY,
  txnid: "eb_abc",
  amount: "1180.00",
  productinfo: "Course",
  firstname: "Asha",
  email: "a@t.test",
};

/** What Easebuzz POSTs back to surl/furl, signed with the reverse sequence. */
function callback(over: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    key: KEY,
    txnid: "eb_abc",
    amount: "1180.00",
    productinfo: "Course",
    firstname: "Asha",
    email: "a@t.test",
    status: "success",
    easepayid: "E2610140001",
    ...over,
  };
  if (!over.hash) {
    fields.hash = sha(
      [SALT, fields.status, "", "", "", "", "", "", "", "", "", "", fields.email, fields.firstname, fields.productinfo, fields.amount, fields.txnid, fields.key].join("|"),
    );
  }
  return fields;
}

describe("easebuzz hashes", () => {
  it("request hash is key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt (SHA-512)", () => {
    expect(requestHash(params, SALT)).toBe(
      sha("testkey|eb_abc|1180.00|Course|Asha|a@t.test" + "|".repeat(11) + "testsalt"),
    );
  });
  it("response hash is the reverse sequence starting at the salt", () => {
    const f = callback();
    expect(responseHash(f, SALT)).toBe(f.hash);
  });
  it("prefixes additional_charges when the gateway sends it", () => {
    const f = callback({ additional_charges: "5.00" });
    // hash above was built without the prefix, so it must NOT verify once the field is present
    expect(verifyEasebuzzCallback(f, SALT)).toBe(false);
    const withExtra = sha(
      ["5.00", SALT, f.status, "", "", "", "", "", "", "", "", "", "", f.email, f.firstname, f.productinfo, f.amount, f.txnid, f.key].join("|"),
    );
    expect(verifyEasebuzzCallback({ ...f, hash: withExtra }, SALT)).toBe(true);
  });
});

describe("verifyEasebuzzCallback", () => {
  it("accepts a correctly signed callback", () => {
    expect(verifyEasebuzzCallback(callback(), SALT)).toBe(true);
  });
  it.each([
    ["amount", "1.00"],
    ["status", "failure"],
    ["txnid", "eb_other"],
    ["email", "evil@t.test"],
  ])("rejects a tampered %s", (field, value) => {
    expect(verifyEasebuzzCallback({ ...callback(), [field]: value }, SALT)).toBe(false);
  });
  it("rejects a wrong salt, a missing hash, and a malformed hash", () => {
    expect(verifyEasebuzzCallback(callback(), "other-salt")).toBe(false);
    expect(verifyEasebuzzCallback({ ...callback(), hash: "" }, SALT)).toBe(false);
    expect(verifyEasebuzzCallback({ ...callback(), hash: "zz" }, SALT)).toBe(false);
  });
  it("rejects when the salt is empty", () => {
    expect(verifyEasebuzzCallback(callback(), "")).toBe(false);
  });
});

describe("formatAmount", () => {
  it("renders integer paise as a 2-decimal rupee string", () => {
    expect(formatAmount(118000)).toBe("1180.00");
    expect(formatAmount(100)).toBe("1.00");
    expect(formatAmount(1)).toBe("0.01");
    expect(formatAmount(12345)).toBe("123.45");
  });
});

describe("EasebuzzProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("createOrder mints a local txnid (no network) within Easebuzz's 40-char limit", async () => {
    const p = new EasebuzzProvider(KEY, SALT, "test");
    const a = await p.createOrder();
    const b = await p.createOrder();
    expect(a.providerOrderId).toMatch(/^eb_[0-9a-f]{32}$/);
    expect(a.providerOrderId).not.toBe(b.providerOrderId);
    expect(a.providerOrderId.length).toBeLessThanOrEqual(40);
  });

  it("initiatePayment posts a signed form to the test host and returns the pay URL", async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: 1, data: "ACCESSKEY123" }));
    vi.stubGlobal("fetch", fetchMock);
    const p = new EasebuzzProvider(KEY, SALT, "test");
    const { payUrl } = await p.initiatePayment({
      txnid: "eb_abc",
      amountPaise: 118000,
      productinfo: "Course",
      firstname: "Asha",
      email: "a@t.test",
      phone: "9999999999",
      surl: "http://localhost:3100/api/easebuzz/return",
      furl: "http://localhost:3100/api/easebuzz/return",
    });
    expect(payUrl).toBe("https://testpay.easebuzz.in/pay/ACCESSKEY123");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://testpay.easebuzz.in/payment/initiateLink");
    const sent = new URLSearchParams(String(init.body));
    expect(sent.get("amount")).toBe("1180.00");
    expect(sent.get("hash")).toBe(requestHash(params, SALT));
    expect(sent.has("salt")).toBe(false); // the salt never leaves the server
  });

  it("uses the production host only when env is prod", async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: 1, data: "K" }));
    vi.stubGlobal("fetch", fetchMock);
    const { payUrl } = await new EasebuzzProvider(KEY, SALT, "prod").initiatePayment({
      txnid: "t", amountPaise: 100, productinfo: "p", firstname: "f", email: "e@t.test",
      phone: "9999999999", surl: "https://x/s", furl: "https://x/f",
    });
    expect(payUrl).toBe("https://pay.easebuzz.in/pay/K");
  });

  it("surfaces a gateway rejection instead of returning a URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: 0, data: "Invalid hash" })));
    await expect(
      new EasebuzzProvider(KEY, SALT, "test").initiatePayment({
        txnid: "t", amountPaise: 100, productinfo: "p", firstname: "f", email: "e@t.test",
        phone: "9999999999", surl: "http://x/s", furl: "http://x/f",
      }),
    ).rejects.toThrow(/Invalid hash/);
  });

  it("never claims Razorpay-style verification succeeded", () => {
    const p: PaymentProvider = new EasebuzzProvider(KEY, SALT, "test");
    expect(p.verifyPayment("o", "p", "sig")).toBe(false);
    expect(p.verifyWebhook("{}", "sig")).toBe(false);
  });
});

describe("getProvider with Easebuzz", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("selects Easebuzz when its keys are set and Razorpay's are not", () => {
    vi.stubEnv("EASEBUZZ_KEY", KEY);
    vi.stubEnv("EASEBUZZ_SALT", SALT);
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    expect(getProvider().name).toBe("easebuzz");
  });
  it("Easebuzz beats the mock fallback", () => {
    vi.stubEnv("EASEBUZZ_KEY", KEY);
    vi.stubEnv("EASEBUZZ_SALT", SALT);
    vi.stubEnv("PAYMENTS_MODE", "mock");
    expect(getProvider().name).toBe("easebuzz");
  });
  it("with both gateways configured, PAYMENTS_PROVIDER decides; default stays Razorpay", () => {
    vi.stubEnv("EASEBUZZ_KEY", KEY);
    vi.stubEnv("EASEBUZZ_SALT", SALT);
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "s");
    expect(getProvider().name).toBe("razorpay");
    vi.stubEnv("PAYMENTS_PROVIDER", "easebuzz");
    expect(getProvider().name).toBe("easebuzz");
  });
  it("a half-configured Easebuzz (key without salt) is not used", () => {
    vi.stubEnv("EASEBUZZ_KEY", KEY);
    vi.stubEnv("EASEBUZZ_SALT", "");
    vi.stubEnv("PAYMENTS_MODE", "mock");
    expect(getProvider().name).toBe("mock");
  });
});

describe("rupeesToPaise", () => {
  it.each([["1180.00", 118000], ["999", 99900], ["0.5", 50], ["0.05", 5], [" 12.30 ", 1230]])("%j -> %i", (i, o) => expect(rupeesToPaise(i)).toBe(o));
  it.each([["1e3"], ["0x10"], [""], [undefined], ["-1.00"], ["1.234"], ["1,180.00"], ["12345678901"]])("rejects %j", (i) => expect(rupeesToPaise(i)).toBeNull());
});

describe("attempt txnids", () => {
  it("are unique per call, <= 40 chars, and map back to the order id", () => {
    const id = `eb_${"a".repeat(32)}`;
    const seen = new Set(Array.from({ length: 50 }, () => attemptTxnid(id)));
    expect(seen.size).toBeGreaterThan(40);
    for (const t of seen) {
      expect(t.length).toBeLessThanOrEqual(40);
      expect(orderIdFromTxnid(t)).toBe(id);
    }
    expect(orderIdFromTxnid(id)).toBe(id);
  });
});

describe("EASEBUZZ_ENV guard", () => {
  afterEach(() => vi.unstubAllEnvs());
  const configure = () => {
    vi.stubEnv("EASEBUZZ_KEY", KEY);
    vi.stubEnv("EASEBUZZ_SALT", SALT);
  };
  it("refuses sandbox (unset or test) in production", () => {
    configure();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EASEBUZZ_ENV", "");
    expect(() => getProvider()).toThrow(/production/);
    vi.stubEnv("EASEBUZZ_ENV", "test");
    expect(() => getProvider()).toThrow(/production/);
    expect(() => getEasebuzzProvider()).toThrow(/production/);
  });
  it("allows prod env in production", () => {
    configure();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EASEBUZZ_ENV", "prod");
    expect(getProvider().name).toBe("easebuzz");
  });
  it("rejects any EASEBUZZ_ENV that is not exactly test or prod", () => {
    configure();
    for (const bad of ["production", "Prod", "sandbox", "live"]) {
      vi.stubEnv("EASEBUZZ_ENV", bad);
      expect(() => getProvider()).toThrow(/exactly/);
    }
  });
  it("getEasebuzzProvider is null when unconfigured", () => {
    vi.stubEnv("EASEBUZZ_KEY", "");
    expect(getEasebuzzProvider()).toBeNull();
  });
});

describe("access key handling", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("refuses an access key that is not plain alphanumerics", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: 1, data: "../evil?x=1" })));
    await expect(
      new EasebuzzProvider(KEY, SALT, "test").initiatePayment({
        txnid: "t", amountPaise: 100, productinfo: "p", firstname: "f", email: "e@t.test",
        phone: "9999999999", surl: "http://x/s", furl: "http://x/f",
      }),
    ).rejects.toThrow(/access key/);
  });
});
