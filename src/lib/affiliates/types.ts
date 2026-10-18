export interface AffiliatePartner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  code: string; // e.g. "RAHUL20"
  commissionPct: number; // e.g. 20
  clicks: number;
  conversions: number;
  gmvPaise: number;
  unpaidCommissionPaise: number;
  paidCommissionPaise: number;
  payoutUpiId?: string;
  status: "active" | "paused";
  createdAt: string;
  lastPayoutAt?: string;
  lastPayoutUtr?: string;
}

export interface AffiliateProgramConfig {
  enabled: boolean;
  defaultCommissionPct: number;
  cookieDays: number;
  termsNote?: string;
  partners: AffiliatePartner[];
}
