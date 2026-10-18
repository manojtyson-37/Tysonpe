"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth/session";
import {
  getCreatorIntegrations,
  saveCreatorIntegrations,
  testSendWebhook,
} from "@/lib/integrations/service";
import type {
  CreatorIntegrationsConfig,
  CreatorWebhookEndpoint,
  LiveClassConfig,
  TelegramConfig,
  TrackingPixelsConfig,
  WebhookEventName,
} from "@/lib/integrations/types";

export async function getIntegrationsAction(): Promise<{
  ok: boolean;
  config?: CreatorIntegrationsConfig;
  error?: string;
}> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    return { ok: true, config };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function addWebhookEndpointAction(input: {
  url: string;
  secret?: string;
  events: WebhookEventName[];
}): Promise<{ ok: boolean; webhook?: CreatorWebhookEndpoint; error?: string }> {
  try {
    const { creator } = await requireCreator();
    if (!input.url || !input.url.startsWith("http")) {
      return { ok: false, error: "A valid HTTP or HTTPS endpoint URL is required." };
    }
    if (!input.events || input.events.length === 0) {
      return { ok: false, error: "Please select at least one event to trigger this webhook." };
    }

    const config = await getCreatorIntegrations(creator.id);
    const newHook: CreatorWebhookEndpoint = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: input.url.trim(),
      secret: input.secret?.trim() || Math.random().toString(36).slice(2, 16),
      events: input.events,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    config.webhooks.unshift(newHook);
    await saveCreatorIntegrations(creator.id, config);
    revalidatePath("/dashboard/integrations");

    return { ok: true, webhook: newHook };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteWebhookEndpointAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    config.webhooks = config.webhooks.filter((h) => h.id !== id);
    await saveCreatorIntegrations(creator.id, config);
    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleWebhookEndpointAction(
  id: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    const hook = config.webhooks.find((h) => h.id === id);
    if (hook) {
      hook.enabled = enabled;
      await saveCreatorIntegrations(creator.id, config);
      revalidatePath("/dashboard/integrations");
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testWebhookAction(input: {
  url: string;
  secret?: string;
  event: WebhookEventName;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}> {
  try {
    await requireCreator();
    const res = await testSendWebhook(input.url, input.secret || "", input.event);
    return {
      ok: res.success,
      statusCode: res.statusCode,
      latencyMs: res.latencyMs,
      error: res.error,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveTrackingPixelsAction(
  tracking: TrackingPixelsConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    config.tracking = tracking;
    await saveCreatorIntegrations(creator.id, config);
    revalidatePath("/dashboard/integrations");
    revalidatePath(`/c/${creator.handle}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveLiveClassAction(
  liveClass: LiveClassConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    config.liveClass = liveClass;
    await saveCreatorIntegrations(creator.id, config);
    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveTelegramAction(
  telegram: TelegramConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    config.telegram = telegram;
    await saveCreatorIntegrations(creator.id, config);
    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
