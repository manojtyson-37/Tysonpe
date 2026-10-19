import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createJodoPayOrder,
  getJodoPayOrder,
  completeJodoOrderAndUnlock,
  JODO_CONFIG,
} from "./jodo";
import { db } from "@/lib/db";

// Mock fetch for deterministic testing
const globalFetch = global.fetch;

describe("Jodo Payment Gateway Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("configures standard DevTest1 endpoint and authorization credentials", () => {
    expect(JODO_CONFIG.baseUrl).toContain("jodopay.com");
    expect(JODO_CONFIG.apiKey).toBe("81329eb5c322");
    expect(JODO_CONFIG.authHeader).toContain("Basic ODEzMjllYjVjMzIyOjgxOGE0MGQ3LWZjMTMtNDQ4MC05YjdhLTRmYzZkZTJiZDc0YQ==");
  });

  it("creates a Jodo Pay Order via API and returns hosted redirect URL", async () => {
    const mockResponse = {
      status: "success",
      data: {
        order_id: "order_test_998877",
        redirect_url: "https://pay.devtest1.jodopay.com/pages/test_page?order=order_test_998877",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const res = await createJodoPayOrder({
      name: "Ron Rivest",
      phone: "9876543210",
      email: "customer@example.com",
      amountRupees: 100,
      callbackUrl: "https://tysonpe.vercel.app/payment/jodo/callback",
    });

    expect(res.ok).toBe(true);
    expect(res.orderId).toBe("order_test_998877");
    expect(res.redirectUrl).toContain("pay.devtest1.jodopay.com");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/integrations/pay/orders"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: JODO_CONFIG.authHeader,
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("retrieves the order status using the Get Order API", async () => {
    const mockOrderData = {
      status: "success",
      data: {
        id: "order_test_998877",
        name: "Ron Rivest",
        phone: "9876543210",
        email: "customer@example.com",
        status: "paid",
        transaction_id: "trans_abc_123",
        paid_at: "2026-10-19T06:00:00Z",
        details: [{ component_type: "Payable Amount", amount: 100.0 }],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOrderData,
    });

    const res = await getJodoPayOrder("order_test_998877");
    expect(res.ok).toBe(true);
    expect(res.data?.status).toBe("paid");
    expect(res.data?.name).toBe("Ron Rivest");
    expect(res.data?.email).toBe("customer@example.com");
  });

  it("handles course unlock idempotently when already unlocked", async () => {
    // Mock getJodoPayOrder
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          id: "order_already_paid",
          status: "paid",
          name: "Ron Rivest",
          email: "customer@example.com",
          phone: "9876543210",
        },
      }),
    });

    // Mock db.order.findUnique to simulate existing paid order
    vi.spyOn(db.order, "findUnique").mockResolvedValue({
      id: "ord_db_123",
      status: "paid",
      invoiceNo: "TP/2026-27/00099",
      totalPaise: 10000,
      product: { title: "AI Engineering Cohort" },
      user: { name: "Ron Rivest", email: "customer@example.com" },
    } as any);

    const unlockRes = await completeJodoOrderAndUnlock("order_already_paid");
    expect(unlockRes.ok).toBe(true);
    expect(unlockRes.alreadyUnlocked).toBe(true);
    expect(unlockRes.invoiceNo).toBe("TP/2026-27/00099");
  });

  it("refuses course unlock if Jodo order status is unpaid", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          id: "order_pending",
          status: "unpaid",
          name: "Ron Rivest",
          email: "customer@example.com",
          phone: "9876543210",
        },
      }),
    });

    const unlockRes = await completeJodoOrderAndUnlock("order_pending");
    expect(unlockRes.ok).toBe(false);
    expect(unlockRes.status).toBe("unpaid");
    expect(unlockRes.error).toContain("Order is currently 'unpaid'");
  });
});
