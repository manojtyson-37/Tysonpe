"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth/session";
import {
  getCreatorAffiliateConfig,
  saveCreatorAffiliateConfig,
  settleAffiliatePayout,
} from "@/lib/affiliates/service";
import type { AffiliatePartner, AffiliateProgramConfig } from "@/lib/affiliates/types";

export async function getAffiliateConfigAction(): Promise<{
  ok: boolean;
  config?: AffiliateProgramConfig;
  error?: string;
}> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorAffiliateConfig(creator.id);
    return { ok: true, config };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveAffiliateSettingsAction(input: {
  enabled: boolean;
  defaultCommissionPct: number;
  cookieDays: number;
  termsNote?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorAffiliateConfig(creator.id);

    config.enabled = input.enabled;
    config.defaultCommissionPct = Math.min(100, Math.max(1, input.defaultCommissionPct));
    config.cookieDays = Math.max(1, input.cookieDays);
    config.termsNote = input.termsNote;

    await saveCreatorAffiliateConfig(creator.id, config);
    revalidatePath("/dashboard/affiliates");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createAffiliatePartnerAction(input: {
  name: string;
  email: string;
  phone?: string;
  code: string;
  commissionPct?: number;
  payoutUpiId?: string;
}): Promise<{ ok: boolean; partner?: AffiliatePartner; error?: string }> {
  try {
    const { creator } = await requireCreator();

    if (!input.name.trim() || !input.email.trim() || !input.code.trim()) {
      return { ok: false, error: "Name, email, and unique referral code are required." };
    }

    const cleanCode = input.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "");

    if (cleanCode.length < 3) {
      return { ok: false, error: "Referral code must be at least 3 alphanumeric characters." };
    }

    const config = await getCreatorAffiliateConfig(creator.id);

    // Ensure code is unique among this creator's partners
    const existing = config.partners.find((p) => p.code.toUpperCase() === cleanCode);
    if (existing) {
      return { ok: false, error: `Referral code "${cleanCode}" is already in use by ${existing.name}.` };
    }

    const newPartner: AffiliatePartner = {
      id: `aff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      code: cleanCode,
      commissionPct: input.commissionPct ?? config.defaultCommissionPct ?? 20,
      clicks: 0,
      conversions: 0,
      gmvPaise: 0,
      unpaidCommissionPaise: 0,
      paidCommissionPaise: 0,
      payoutUpiId: input.payoutUpiId?.trim() || undefined,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    config.partners.unshift(newPartner);
    await saveCreatorAffiliateConfig(creator.id, config);
    revalidatePath("/dashboard/affiliates");

    return { ok: true, partner: newPartner };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteAffiliatePartnerAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorAffiliateConfig(creator.id);
    config.partners = config.partners.filter((p) => p.id !== id);
    await saveCreatorAffiliateConfig(creator.id, config);
    revalidatePath("/dashboard/affiliates");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleAffiliatePartnerAction(
  id: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { creator } = await requireCreator();
    const config = await getCreatorAffiliateConfig(creator.id);
    const partner = config.partners.find((p) => p.id === id);
    if (partner) {
      partner.status = active ? "active" : "paused";
      await saveCreatorAffiliateConfig(creator.id, config);
      revalidatePath("/dashboard/affiliates");
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function settleAffiliateAction(input: {
  partnerId: string;
  utrReference: string;
}): Promise<{ ok: boolean; settledAmountPaise?: number; error?: string }> {
  try {
    const { creator } = await requireCreator();
    if (!input.utrReference.trim()) {
      return { ok: false, error: "UPI Transaction Reference / UTR number is required." };
    }

    const res = await settleAffiliatePayout(creator.id, input.partnerId, input.utrReference.trim());
    if (res.success) {
      revalidatePath("/dashboard/affiliates");
      return { ok: true, settledAmountPaise: res.settledAmountPaise };
    }
    return { ok: false, error: res.error || "Failed to settle payout." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
