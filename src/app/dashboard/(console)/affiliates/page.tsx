import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth/session";
import { getCreatorAffiliateConfig } from "@/lib/affiliates/service";
import { AffiliatesDashboard } from "@/components/affiliates/AffiliatesDashboard";

export const metadata: Metadata = {
  title: "Affiliate & Partner Network",
  description: "Recruit brand partners, assign custom referral links, track conversions, and settle commissions via UPI.",
};

export default async function AffiliatesPage() {
  const { creator } = await requireCreator();
  const config = await getCreatorAffiliateConfig(creator.id);

  return (
    <AffiliatesDashboard
      initialConfig={config}
      creatorHandle={creator.handle}
    />
  );
}
