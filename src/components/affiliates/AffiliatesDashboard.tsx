"use client";

import { useState, useTransition } from "react";
import type { AffiliatePartner, AffiliateProgramConfig } from "@/lib/affiliates/types";
import { formatINR } from "@/lib/money";
import {
  createAffiliatePartnerAction,
  deleteAffiliatePartnerAction,
  saveAffiliateSettingsAction,
  settleAffiliateAction,
  toggleAffiliatePartnerAction,
} from "@/app/actions/affiliates";

interface AffiliatesDashboardProps {
  initialConfig: AffiliateProgramConfig;
  creatorHandle: string;
}

export function AffiliatesDashboard({
  initialConfig,
  creatorHandle,
}: AffiliatesDashboardProps) {
  const [config, setConfig] = useState<AffiliateProgramConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<"partners" | "settings">("partners");
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Partner Modal
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerCommission, setPartnerCommission] = useState<number>(config.defaultCommissionPct || 20);
  const [partnerUpi, setPartnerUpi] = useState("");

  // Settle Payout Modal
  const [settlePartner, setSettlePartner] = useState<AffiliatePartner | null>(null);
  const [settleUtr, setSettleUtr] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    enabled: config.enabled,
    defaultCommissionPct: config.defaultCommissionPct,
    cookieDays: config.cookieDays,
    termsNote: config.termsNote || "",
  });

  const showToast = (text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tysonpe.com";
    const refUrl = `${origin}/c/${creatorHandle}?ref=${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(refUrl);
      setCopiedCode(code);
      showToast(`Referral link copied: ${refUrl}`);
      setTimeout(() => setCopiedCode(null), 1800);
    }
  };

  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || !partnerEmail.trim() || !partnerCode.trim()) return;

    startTransition(async () => {
      const res = await createAffiliatePartnerAction({
        name: partnerName,
        email: partnerEmail,
        phone: partnerPhone || undefined,
        code: partnerCode,
        commissionPct: Number(partnerCommission),
        payoutUpiId: partnerUpi || undefined,
      });

      if (res.ok && res.partner) {
        setConfig((prev) => ({
          ...prev,
          partners: [res.partner!, ...prev.partners],
        }));
        setShowAddPartnerModal(false);
        setPartnerName("");
        setPartnerEmail("");
        setPartnerPhone("");
        setPartnerCode("");
        setPartnerUpi("");
        showToast(`Affiliate partner "${res.partner.name}" added successfully!`);
      } else {
        showToast(res.error || "Failed to add partner", false);
      }
    });
  };

  const handleDeletePartner = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove affiliate partner "${name}"?`)) return;
    startTransition(async () => {
      const res = await deleteAffiliatePartnerAction(id);
      if (res.ok) {
        setConfig((prev) => ({
          ...prev,
          partners: prev.partners.filter((p) => p.id !== id),
        }));
        showToast(`Partner "${name}" removed`);
      } else {
        showToast(res.error || "Failed to delete partner", false);
      }
    });
  };

  const handleTogglePartner = (id: string, currentStatus: "active" | "paused") => {
    const nextStatus = currentStatus === "active" ? false : true;
    setConfig((prev) => ({
      ...prev,
      partners: prev.partners.map((p) =>
        p.id === id ? { ...p, status: nextStatus ? "active" : "paused" } : p
      ),
    }));

    startTransition(async () => {
      const res = await toggleAffiliatePartnerAction(id, nextStatus);
      if (!res.ok) {
        showToast("Failed to update status", false);
      } else {
        showToast(nextStatus ? "Partner activated" : "Partner paused");
      }
    });
  };

  const handleSettlePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlePartner || !settleUtr.trim()) return;

    setIsSettling(true);
    startTransition(async () => {
      const res = await settleAffiliateAction({
        partnerId: settlePartner.id,
        utrReference: settleUtr,
      });

      setIsSettling(false);
      if (res.ok && res.settledAmountPaise) {
        setConfig((prev) => ({
          ...prev,
          partners: prev.partners.map((p) =>
            p.id === settlePartner.id
              ? {
                  ...p,
                  paidCommissionPaise: (p.paidCommissionPaise || 0) + res.settledAmountPaise!,
                  unpaidCommissionPaise: 0,
                  lastPayoutUtr: settleUtr,
                  lastPayoutAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        setSettlePartner(null);
        setSettleUtr("");
        showToast(`Settled ${formatINR(res.settledAmountPaise)} payout for ${settlePartner.name}!`);
      } else {
        showToast(res.error || "Failed to settle payout", false);
      }
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveAffiliateSettingsAction(settingsForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, ...settingsForm }));
        showToast("Affiliate program rules saved!");
      } else {
        showToast(res.error || "Failed to save settings", false);
      }
    });
  };

  // Metrics rollups
  const totalGmvPaise = config.partners.reduce((sum, p) => sum + (p.gmvPaise || 0), 0);
  const totalUnpaidPaise = config.partners.reduce((sum, p) => sum + (p.unpaidCommissionPaise || 0), 0);
  const totalPaidPaise = config.partners.reduce((sum, p) => sum + (p.paidCommissionPaise || 0), 0);
  const totalOrders = config.partners.reduce((sum, p) => sum + (p.conversions || 0), 0);
  const activePartnersCount = config.partners.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${
            toastMsg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${toastMsg.ok ? "bg-emerald-500" : "bg-red-500"}`} />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Affiliates & Partners
            </h1>
            <span
              className={`badge text-[10px] font-bold uppercase tracking-wider ${
                config.enabled ? "badge-good" : "badge-muted"
              }`}
            >
              {config.enabled ? "Program Active" : "Paused"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Empower community advocates and influencers to sell your courses with custom referral links and automated commission tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddPartnerModal(true)}
            className="btn btn-primary btn-sm"
          >
            <span>+ Add Partner</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Total Revenue Driven */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Partner Revenue (GMV)
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {formatINR(totalGmvPaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{totalOrders} referral sales</span>
            <span className="badge badge-brand text-[10px]">Tracked</span>
          </div>
        </div>

        {/* Metric 2: Unpaid Commissions */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Unpaid Commissions
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {formatINR(totalUnpaidPaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Pending settlement</span>
            <span className={`badge ${totalUnpaidPaise > 0 ? "badge-warn" : "badge-good"} text-[10px]`}>
              {totalUnpaidPaise > 0 ? "Payout Due" : "Settled Up"}
            </span>
          </div>
        </div>

        {/* Metric 3: Paid Out Lifetime */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Lifetime Paid Out
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {formatINR(totalPaidPaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Direct UPI transfers</span>
            <span className="badge badge-good text-[10px]">Verified</span>
          </div>
        </div>

        {/* Metric 4: Active Partners */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Active Partners
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {activePartnersCount}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Default {config.defaultCommissionPct}% share</span>
            <span className="badge badge-muted text-[10px]">{config.cookieDays}d Cookie</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("partners")}
            className={`px-4 py-2.5 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px active:scale-[0.98] ${
              activeTab === "partners"
                ? "border-brand text-brand font-bold"
                : "border-transparent text-muted hover:text-ink hover:border-line"
            }`}
          >
            Partners Directory ({config.partners.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px active:scale-[0.98] ${
              activeTab === "settings"
                ? "border-brand text-brand font-bold"
                : "border-transparent text-muted hover:text-ink hover:border-line"
            }`}
          >
            Program Rules & Commission Settings
          </button>
        </div>
      </div>

      {/* TAB 1: PARTNERS DIRECTORY */}
      {activeTab === "partners" && (
        <div className="space-y-4">
          {config.partners.length === 0 ? (
            <div className="card p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-brand">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-ink">No Affiliate Partners Yet</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Create custom referral codes for top students or creator colleagues. When buyers use their link or coupon code, commissions are automatically tracked!
              </p>
              <button
                onClick={() => setShowAddPartnerModal(true)}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <span>+ Add Your First Affiliate</span>
              </button>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Partner & Code</th>
                    <th>Referral Link</th>
                    <th>Commission</th>
                    <th>Clicks / Sales</th>
                    <th>GMV Driven</th>
                    <th>Unpaid Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {config.partners.map((p) => {
                    const isCopied = copiedCode === p.code;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="font-bold text-ink">{p.name}</div>
                          <div className="text-xs text-muted font-mono">{p.email}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="badge badge-brand text-[10px] font-mono">
                              {p.code}
                            </span>
                            {p.status === "paused" && (
                              <span className="badge badge-muted text-[9px]">Paused</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <button
                            onClick={() => handleCopyLink(p.code)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                          >
                            <span>{isCopied ? "✓ Link Copied!" : "Copy Referral Link"}</span>
                          </button>
                          <div className="text-[10px] text-muted font-mono mt-0.5">
                            ?ref={p.code}
                          </div>
                        </td>

                        <td className="tabular-nums font-semibold">{p.commissionPct}%</td>

                        <td className="tabular-nums text-xs">
                          <span className="font-bold text-ink">{p.conversions}</span> sales
                          <span className="text-muted block text-[11px]">({p.clicks} clicks)</span>
                        </td>

                        <td className="tabular-nums font-semibold">{formatINR(p.gmvPaise)}</td>

                        <td>
                          <div className="tabular-nums font-bold text-ink">
                            {formatINR(p.unpaidCommissionPaise)}
                          </div>
                          {p.payoutUpiId && (
                            <span className="text-[10px] font-mono text-muted block">
                              {p.payoutUpiId}
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            {p.unpaidCommissionPaise > 0 && (
                              <button
                                onClick={() => {
                                  setSettlePartner(p);
                                  setSettleUtr("");
                                }}
                                className="btn btn-primary btn-sm text-xs"
                              >
                                Settle UPI
                              </button>
                            )}

                            <button
                              onClick={() => handleTogglePartner(p.id, p.status)}
                              className="text-xs text-muted hover:text-ink font-semibold"
                            >
                              {p.status === "active" ? "Pause" : "Activate"}
                            </button>

                            <button
                              onClick={() => handleDeletePartner(p.id, p.name)}
                              className="text-xs text-bad hover:underline ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROGRAM SETTINGS */}
      {activeTab === "settings" && (
        <div className="card max-w-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Affiliate Program Settings</h2>
            <p className="text-xs text-muted mt-0.5">
              Control the default commission rates and attribution policies across your store.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl border border-line bg-surface-2/40">
              <div>
                <p className="text-xs font-bold text-ink">Enable Affiliate Marketing</p>
                <p className="text-[11px] text-muted">
                  When enabled, buyers carrying affiliate referral parameters (?ref=...) are tracked.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.enabled}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="h-5 w-5 rounded border-line text-brand focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Default Commission Rate (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settingsForm.defaultCommissionPct}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      defaultCommissionPct: parseInt(e.target.value, 10) || 20,
                    }))
                  }
                  className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
                  required
                />
                <span className="text-[10px] text-muted">Standard industry average is 15% – 30%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Cookie Attribution Window (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settingsForm.cookieDays}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      cookieDays: parseInt(e.target.value, 10) || 30,
                    }))
                  }
                  className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
                  required
                />
                <span className="text-[10px] text-muted">Days after referral click that sale is credited</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Terms & Payout Policies
              </label>
              <textarea
                rows={3}
                value={settingsForm.termsNote}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, termsNote: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs text-ink"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-md"
            >
              {isPending ? "Saving..." : "Save Program Settings"}
            </button>
          </form>
        </div>
      )}

      {/* ADD AFFILIATE PARTNER MODAL */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink font-display">
                Add Affiliate Partner
              </h3>
              <button
                onClick={() => setShowAddPartnerModal(false)}
                className="text-muted hover:text-ink text-sm px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Partner Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. rahul@influencer.com"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Unique Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RAHUL20"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs font-mono uppercase text-ink"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={partnerCommission}
                    onChange={(e) => setPartnerCommission(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs font-mono text-ink"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Settlement UPI ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul@okhdfcbank"
                  value={partnerUpi}
                  onChange={(e) => setPartnerUpi(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs font-mono text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !partnerName || !partnerEmail || !partnerCode}
                  className="btn btn-primary btn-sm"
                >
                  {isPending ? "Creating..." : "Save Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE PAYOUT MODAL */}
      {settlePartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink font-display">
                Settle Affiliate Commission via UPI
              </h3>
              <button
                onClick={() => setSettlePartner(null)}
                className="text-muted hover:text-ink text-sm px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface-2/40 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Partner:</span>
                <span className="font-bold text-ink">{settlePartner.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Payable Amount:</span>
                <span className="font-extrabold text-good font-display text-base tabular-nums">
                  {formatINR(settlePartner.unpaidCommissionPaise)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Recipient UPI:</span>
                <span className="font-mono font-bold text-ink">
                  {settlePartner.payoutUpiId || "Not specified"}
                </span>
              </div>
            </div>

            <form onSubmit={handleSettlePayout} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  12-digit UPI Transaction Ref / UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. 428910293847"
                  value={settleUtr}
                  onChange={(e) => setSettleUtr(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs font-mono text-ink"
                  required
                />
                <span className="text-[10px] text-muted">
                  From your PhonePe, Google Pay, Paytm, or bank transfer confirmation receipt.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setSettlePartner(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling || !settleUtr.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {isSettling ? "Recording..." : "Confirm & Mark Settled"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
