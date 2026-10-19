"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth/session";
import {
  getCreatorIntegrations,
  saveCreatorIntegrations,
} from "@/lib/integrations/service";
import { processInboundWebhook } from "@/lib/inbound-webhooks/service";
import type {
  InboundWebhookEndpoint,
  InboundWebhookLog,
} from "@/lib/integrations/types";

export async function generateInboundEndpointAction(input?: {
  name?: string;
  partner?: "jodo" | "generic" | "custom";
  secret?: string;
}): Promise<{ ok: boolean; endpoint?: InboundWebhookEndpoint; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);

    const token = `inwh_tok_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const newEndpoint: InboundWebhookEndpoint = {
      id: `inwh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      token,
      name: input?.name?.trim() || "Jodo / Institutional Gateway",
      partner: input?.partner || "jodo",
      secret: input?.secret?.trim() || undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
      totalReceived: 0,
    };

    const updatedEndpoints = [newEndpoint, ...(config.inboundEndpoints || [])];
    await saveCreatorIntegrations(creator.id, {
      ...config,
      inboundEndpoints: updatedEndpoints,
    });

    revalidatePath("/dashboard/integrations");
    return { ok: true, endpoint: newEndpoint };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleInboundEndpointAction(
  endpointId: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);

    const updated = (config.inboundEndpoints || []).map((ep) =>
      ep.id === endpointId ? { ...ep, enabled } : ep
    );

    await saveCreatorIntegrations(creator.id, {
      ...config,
      inboundEndpoints: updated,
    });

    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteInboundEndpointAction(
  endpointId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);

    const updated = (config.inboundEndpoints || []).filter((ep) => ep.id !== endpointId);
    await saveCreatorIntegrations(creator.id, {
      ...config,
      inboundEndpoints: updated,
    });

    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testInboundWebhookAction(input: {
  endpointId: string;
  payload: Record<string, unknown>;
}): Promise<{
  ok: boolean;
  latencyMs: number;
  orderId?: string;
  invoiceNo?: string;
  amountPaise?: number;
  customerName?: string;
  customerEmail?: string;
  alreadyProcessed?: boolean;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const { creator } = await requireCreator();
    const result = await processInboundWebhook(creator.id, input.endpointId, input.payload);
    const latencyMs = Date.now() - startTime;

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/integrations");

    return {
      ok: result.ok,
      latencyMs,
      orderId: result.orderId,
      invoiceNo: result.invoiceNo,
      amountPaise: result.amountPaise,
      customerName: result.customerName,
      customerEmail: result.customerEmail,
      alreadyProcessed: result.alreadyProcessed,
      error: result.error,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getInboundWebhookLogsAction(): Promise<{
  ok: boolean;
  logs?: InboundWebhookLog[];
  endpoints?: InboundWebhookEndpoint[];
  error?: string;
}> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorIntegrations(creator.id);
    return {
      ok: true,
      logs: config.inboundLogs || [],
      endpoints: config.inboundEndpoints || [],
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
