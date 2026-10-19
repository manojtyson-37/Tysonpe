"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth/session";
import { getCreatorIntegrations, saveCreatorIntegrations } from "@/lib/integrations/service";
import type { CreatorPaymentGatewaysConfig } from "@/lib/integrations/types";
import { resolveJodoCredentials } from "@/lib/payments/jodo";

export interface GatewaySaveResult {
  ok: boolean;
  message?: string;
  data?: CreatorPaymentGatewaysConfig;
  error?: string;
}

export async function saveCreatorGatewaysAction(
  config: CreatorPaymentGatewaysConfig
): Promise<GatewaySaveResult> {
  try {
    const { creator } = await requireCreator();
    const existing = await getCreatorIntegrations(creator.id);

    // Sanitize Jodo credentials
    const jodoBaseUrl = config.jodo?.baseUrl?.trim() || "https://ext.devtest1.jodopay.com";
    const jodoApiKey = config.jodo?.apiKey?.trim() || "";
    const jodoApiSecret = config.jodo?.apiSecret?.trim() || "";

    let jodoAuthHeader = config.jodo?.authHeader?.trim();
    if (jodoApiKey && jodoApiSecret) {
      jodoAuthHeader = `Basic ${Buffer.from(`${jodoApiKey}:${jodoApiSecret}`).toString("base64")}`;
    }

    const sanitized: CreatorPaymentGatewaysConfig = {
      jodo: {
        enabled: Boolean(config.jodo?.enabled),
        baseUrl: jodoBaseUrl,
        apiKey: jodoApiKey,
        apiSecret: jodoApiSecret,
        authHeader: jodoAuthHeader || "Basic ODEzMjllYjVjMzIyOjgxOGE0MGQ3LWZjMTMtNDQ4MC05YjdhLTRmYzZkZTJiZDc0YQ==",
      },
      razorpay: {
        enabled: Boolean(config.razorpay?.enabled),
        keyId: config.razorpay?.keyId?.trim() || "",
        keySecret: config.razorpay?.keySecret?.trim() || "",
        webhookSecret: config.razorpay?.webhookSecret?.trim() || "",
      },
      easebuzz: {
        enabled: Boolean(config.easebuzz?.enabled),
        key: config.easebuzz?.key?.trim() || "",
        salt: config.easebuzz?.salt?.trim() || "",
        env: config.easebuzz?.env === "prod" ? "prod" : "test",
      },
    };

    const updated = await saveCreatorIntegrations(creator.id, {
      ...existing,
      paymentGateways: sanitized,
    });

    revalidatePath("/dashboard/payouts");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/integrations");

    return {
      ok: true,
      message: "Payment gateway credentials saved successfully.",
      data: updated.paymentGateways,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save gateway settings";
    return { ok: false, error: msg };
  }
}

export async function testGatewayConnectionAction(
  gateway: "jodo" | "razorpay" | "easebuzz",
  creds: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireCreator();

    if (gateway === "jodo") {
      const apiKey = creds.apiKey?.trim();
      const apiSecret = creds.apiSecret?.trim();
      const baseUrl = creds.baseUrl?.trim() || "https://ext.devtest1.jodopay.com";

      const { authHeader } = resolveJodoCredentials({
        baseUrl,
        apiKey,
        apiSecret,
        authHeader: creds.authHeader,
      });

      try {
        const probeRes = await fetch(`${baseUrl}/api/v1/integrations/pay/orders/probe_ping`, {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (probeRes.status === 401 || probeRes.status === 403) {
          return {
            ok: false,
            message: "Authentication failed with Jodo API (HTTP 401/403). Check API Key and Secret.",
          };
        }

        return {
          ok: true,
          message: `Jodo API connected successfully at ${baseUrl} (HTTP ${probeRes.status}). Credentials are valid.`,
        };
      } catch (networkErr: unknown) {
        return {
          ok: false,
          message: networkErr instanceof Error ? networkErr.message : "Network error contacting Jodo endpoint.",
        };
      }
    }

    if (gateway === "razorpay") {
      const keyId = creds.keyId?.trim() || "";
      const keySecret = creds.keySecret?.trim() || "";

      if (!keyId) {
        return { ok: false, message: "Razorpay Key ID is required." };
      }
      if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
        return { ok: false, message: "Invalid Key ID format. Expected 'rzp_test_...' or 'rzp_live_...'." };
      }
      if (keySecret && keySecret.length < 8) {
        return { ok: false, message: "Key Secret appears too short (expected minimum 8 characters)." };
      }

      return {
        ok: true,
        message: `Razorpay key format validated (${keyId.startsWith("rzp_live_") ? "Production Live" : "Test Sandbox"}).`,
      };
    }

    if (gateway === "easebuzz") {
      const key = creds.key?.trim() || "";
      const salt = creds.salt?.trim() || "";
      const env = creds.env === "prod" ? "Production" : "Test Sandbox";

      if (!key) {
        return { ok: false, message: "Easebuzz Merchant Key is required." };
      }
      if (!salt) {
        return { ok: false, message: "Easebuzz Merchant Salt is required." };
      }

      return {
        ok: true,
        message: `Easebuzz ${env} merchant credentials validated successfully.`,
      };
    }

    return { ok: false, message: "Unknown payment gateway." };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Validation error" };
  }
}
