import { db } from "@/lib/db";
import type { AffiliatePartner, AffiliateProgramConfig } from "./types";

export const DEFAULT_AFFILIATE_CONFIG: AffiliateProgramConfig = {
  enabled: true,
  defaultCommissionPct: 20,
  cookieDays: 30,
  termsNote: "Commissions are paid on net order value after standard platform and gateway charges via UPI.",
  partners: [],
};

/**
 * Retrieve affiliate program configuration for a creator
 */
export async function getCreatorAffiliateConfig(
  creatorId: string
): Promise<AffiliateProgramConfig> {
  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    select: { storefrontConfig: true },
  });

  if (!creator?.storefrontConfig) {
    return DEFAULT_AFFILIATE_CONFIG;
  }

  try {
    const raw = JSON.parse(creator.storefrontConfig);
    if (raw.affiliates) {
      return {
        ...DEFAULT_AFFILIATE_CONFIG,
        ...raw.affiliates,
        partners: raw.affiliates.partners || [],
      };
    }
  } catch (err) {
    console.error("Failed to parse affiliate config JSON:", err);
  }

  return DEFAULT_AFFILIATE_CONFIG;
}

/**
 * Persist affiliate program configuration for a creator
 */
export async function saveCreatorAffiliateConfig(
  creatorId: string,
  updated: AffiliateProgramConfig
): Promise<AffiliateProgramConfig> {
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

  raw.affiliates = updated;

  await db.creator.update({
    where: { id: creatorId },
    data: { storefrontConfig: JSON.stringify(raw) },
  });

  return updated;
}

/**
 * Track a click on an affiliate's referral link
 */
export async function recordAffiliateClick(
  creatorHandle: string,
  referralCode: string
): Promise<boolean> {
  const creator = await db.creator.findUnique({
    where: { handle: creatorHandle.toLowerCase() },
    select: { id: true, storefrontConfig: true },
  });

  if (!creator) return false;

  const config = await getCreatorAffiliateConfig(creator.id);
  if (!config.enabled) return false;

  const partner = config.partners.find(
    (p) => p.code.toUpperCase() === referralCode.toUpperCase() && p.status === "active"
  );

  if (!partner) return false;

  partner.clicks = (partner.clicks || 0) + 1;

  saveCreatorAffiliateConfig(creator.id, config).catch(() => {});
  return true;
}

/**
 * Attracts commission to the affiliate when an order is paid
 */
export async function recordAffiliateConversion(
  orderId: string,
  creatorId: string,
  referralCode: string,
  totalPaise: number
): Promise<{ credited: boolean; commissionPaise: number }> {
  if (!referralCode || totalPaise <= 0) {
    return { credited: false, commissionPaise: 0 };
  }

  const config = await getCreatorAffiliateConfig(creatorId);
  if (!config.enabled) {
    return { credited: false, commissionPaise: 0 };
  }

  const partner = config.partners.find(
    (p) => p.code.toUpperCase() === referralCode.toUpperCase() && p.status === "active"
  );

  if (!partner) {
    return { credited: false, commissionPaise: 0 };
  }

  const pct = partner.commissionPct || config.defaultCommissionPct || 20;
  const commissionPaise = Math.round((totalPaise * pct) / 100);

  partner.conversions = (partner.conversions || 0) + 1;
  partner.gmvPaise = (partner.gmvPaise || 0) + totalPaise;
  partner.unpaidCommissionPaise = (partner.unpaidCommissionPaise || 0) + commissionPaise;

  await saveCreatorAffiliateConfig(creatorId, config);

  return { credited: true, commissionPaise };
}

/**
 * Settle unpaid commissions for an affiliate via UPI
 */
export async function settleAffiliatePayout(
  creatorId: string,
  partnerId: string,
  utrReference: string
): Promise<{ success: boolean; settledAmountPaise: number; error?: string }> {
  const config = await getCreatorAffiliateConfig(creatorId);
  const partner = config.partners.find((p) => p.id === partnerId);

  if (!partner) {
    return { success: false, settledAmountPaise: 0, error: "Partner not found" };
  }

  const amountToSettle = partner.unpaidCommissionPaise;
  if (amountToSettle <= 0) {
    return { success: false, settledAmountPaise: 0, error: "No unpaid commission to settle" };
  }

  partner.paidCommissionPaise = (partner.paidCommissionPaise || 0) + amountToSettle;
  partner.unpaidCommissionPaise = 0;
  partner.lastPayoutAt = new Date().toISOString();
  partner.lastPayoutUtr = utrReference;

  await saveCreatorAffiliateConfig(creatorId, config);

  return { success: true, settledAmountPaise: amountToSettle };
}
