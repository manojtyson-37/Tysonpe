import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import type {
  CreatorIntegrationsConfig,
  CreatorWebhookEndpoint,
  WebhookEventName,
} from "./types";

export const DEFAULT_INTEGRATIONS_CONFIG: CreatorIntegrationsConfig = {
  webhooks: [],
  tracking: {
    metaPixelId: "",
    googleAnalyticsId: "",
    gtmContainerId: "",
    enabled: true,
  },
  liveClass: {
    defaultProvider: "zoom",
    meetingUrl: "",
    meetingPassword: "",
    instructions: "Link unlocks 15 minutes before the session starts.",
  },
  emailMarketing: {
    provider: "none",
    apiKey: "",
    audienceId: "",
    tag: "Tysonpe Customer",
    autoSyncLearners: false,
  },
  telegram: {
    channelUrl: "",
    groupName: "",
    autoInviteOnPurchase: false,
  },
};

/**
 * Retrieve integrations configuration for a creator
 */
export async function getCreatorIntegrations(
  creatorId: string
): Promise<CreatorIntegrationsConfig> {
  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    select: { storefrontConfig: true },
  });

  if (!creator?.storefrontConfig) {
    return DEFAULT_INTEGRATIONS_CONFIG;
  }

  try {
    const raw = JSON.parse(creator.storefrontConfig);
    if (raw.integrations) {
      return {
        ...DEFAULT_INTEGRATIONS_CONFIG,
        ...raw.integrations,
        webhooks: raw.integrations.webhooks || [],
        tracking: { ...DEFAULT_INTEGRATIONS_CONFIG.tracking, ...(raw.integrations.tracking || {}) },
        liveClass: { ...DEFAULT_INTEGRATIONS_CONFIG.liveClass, ...(raw.integrations.liveClass || {}) },
        emailMarketing: { ...DEFAULT_INTEGRATIONS_CONFIG.emailMarketing, ...(raw.integrations.emailMarketing || {}) },
        telegram: { ...DEFAULT_INTEGRATIONS_CONFIG.telegram, ...(raw.integrations.telegram || {}) },
      };
    }
  } catch (err) {
    console.error("Failed to parse integrations config JSON:", err);
  }

  return DEFAULT_INTEGRATIONS_CONFIG;
}

/**
 * Persist updated integrations configuration for a creator
 */
export async function saveCreatorIntegrations(
  creatorId: string,
  updated: CreatorIntegrationsConfig
): Promise<CreatorIntegrationsConfig> {
  const creator = await db.creator.findUniqueOrThrow({
    where: { id: creatorId },
    select: { storefrontConfig: true },
  });

  let raw: Record<string, unknown> = {};
  if (creator.storefrontConfig) {
    try {
      raw = JSON.parse(creator.storefrontConfig);
    } catch {
      raw = {};
    }
  }

  raw.integrations = updated;

  await db.creator.update({
    where: { id: creatorId },
    data: { storefrontConfig: JSON.stringify(raw) },
  });

  return updated;
}

/**
 * Generate HMAC SHA256 signature for outgoing webhook payload
 */
export function generateWebhookSignature(secret: string, bodyText: string): string {
  return createHmac("sha256", secret).update(bodyText).digest("hex");
}

/**
 * Dispatches an event to all matching, active webhook endpoints for a creator
 */
export async function dispatchCreatorWebhook(
  creatorId: string,
  event: WebhookEventName,
  data: Record<string, unknown>
): Promise<{ delivered: number; failed: number }> {
  const config = await getCreatorIntegrations(creatorId);
  const activeHooks = config.webhooks.filter(
    (h) => h.enabled && h.events.includes(event) && h.url
  );

  if (activeHooks.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  const payload = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event,
    createdAt: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  let delivered = 0;
  let failed = 0;

  const updatedHooks: CreatorWebhookEndpoint[] = [...config.webhooks];

  await Promise.all(
    activeHooks.map(async (hook) => {
      const signature = hook.secret ? generateWebhookSignature(hook.secret, payloadString) : "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Tysonpe-Webhooks/1.0",
        "X-Tysonpe-Event": event,
      };
      if (signature) {
        headers["X-Tysonpe-Signature"] = signature;
      }

      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body: payloadString,
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        const targetIdx = updatedHooks.findIndex((h) => h.id === hook.id);
        if (targetIdx !== -1) {
          updatedHooks[targetIdx] = {
            ...updatedHooks[targetIdx],
            lastFiredAt: new Date().toISOString(),
            lastStatus: res.status,
            lastError: res.ok ? undefined : `HTTP ${res.status}`,
          };
        }

        if (res.ok) delivered++;
        else failed++;
      } catch (err) {
        failed++;
        const targetIdx = updatedHooks.findIndex((h) => h.id === hook.id);
        if (targetIdx !== -1) {
          updatedHooks[targetIdx] = {
            ...updatedHooks[targetIdx],
            lastFiredAt: new Date().toISOString(),
            lastStatus: 0,
            lastError: err instanceof Error ? err.message : String(err),
          };
        }
      }
    })
  );

  // Update webhook stats in background without blocking
  saveCreatorIntegrations(creatorId, { ...config, webhooks: updatedHooks }).catch(() => {});

  return { delivered, failed };
}

/**
 * Fires an immediate live test payload to an endpoint and returns latency & response
 */
export async function testSendWebhook(
  url: string,
  secret: string,
  event: WebhookEventName = "order.paid"
): Promise<{ success: boolean; statusCode?: number; latencyMs?: number; error?: string }> {
  if (!url || !url.startsWith("http")) {
    return { success: false, error: "Valid HTTP or HTTPS URL required" };
  }

  const samplePayload = {
    id: `evt_test_${Date.now()}`,
    event,
    createdAt: new Date().toISOString(),
    isTest: true,
    data: {
      orderId: "ord_sample_98234",
      amountPaise: 499900,
      currency: "INR",
      productTitle: "Creator Commerce Masterclass (Live Cohort)",
      buyerName: "Rahul Sharma",
      buyerEmail: "rahul@example.com",
      buyerPhone: "919876543210",
      status: "paid",
      invoiceNo: "TYSON-2026-0042",
      gateway: "razorpay",
    },
  };

  const bodyText = JSON.stringify(samplePayload);
  const signature = secret ? generateWebhookSignature(secret, bodyText) : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Tysonpe-Webhook-Tester/1.0",
    "X-Tysonpe-Event": event,
  };
  if (signature) {
    headers["X-Tysonpe-Signature"] = signature;
  }

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: bodyText,
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - startTime;

    return {
      success: res.ok,
      statusCode: res.status,
      latencyMs,
      error: res.ok ? undefined : `Target server responded with HTTP ${res.status}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      statusCode: 0,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
