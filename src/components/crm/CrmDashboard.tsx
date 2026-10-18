"use client";

import { useState, useTransition, useMemo } from "react";
import {
  updateLeadStatusAction,
  toggleBotPausedAction,
  sendDirectMessageAction,
  createLeadAction,
  submitTemplateAction,
  getTemplatesAction,
  deleteTemplateAction,
  testSendTemplateAction,
  importBulkLeadsAction,
  type BulkLeadRow,
} from "@/app/actions/crm";
import type { WhatsAppTemplateItem, WhatsAppAccountInfo } from "@/lib/whatsapp/types";

interface LeadItem {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  intent: string | null;
  notes: string | null;
  quoteAmount: number | null;
  appointmentTime: Date | string | null;
  followUpAt: Date | string | null;
  followUpCount: number;
  botPaused: boolean;
  optedIn: boolean;
  lastInboundAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  messages: Array<{
    id: string;
    direction: string;
    sender: string;
    body: string;
    status: string;
    createdAt: Date | string;
  }>;
}

interface CrmDashboardProps {
  initialLeads: LeadItem[];
  initialTemplates: WhatsAppTemplateItem[];
  accountStatus: WhatsAppAccountInfo;
  creatorHandle: string;
}

const PIPELINE_COLUMNS = [
  { key: "NEW", label: "New Leads", color: "bg-slate-100 text-slate-700" },
  { key: "INQUIRY", label: "Inquiry", color: "bg-blue-50 text-blue-700" },
  { key: "INTERESTED", label: "Interested", color: "bg-indigo-50 text-indigo-700" },
  { key: "QUOTE_SENT", label: "Quote Sent", color: "bg-purple-50 text-purple-700" },
  { key: "CALLBACK", label: "Follow-up Queued", color: "bg-amber-50 text-amber-700" },
  { key: "BOOKED", label: "Enrolled / Won", color: "bg-emerald-50 text-emerald-700" },
];

export function CrmDashboard({
  initialLeads,
  initialTemplates,
  accountStatus,
  creatorHandle,
}: CrmDashboardProps) {
  const [tab, setTab] = useState<"inbox" | "pipeline" | "templates" | "settings">("inbox");
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [templates, setTemplates] = useState<WhatsAppTemplateItem[]>(initialTemplates);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeads[0]?.id || "");
  const [inboxFilter, setInboxFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Template Form State
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [tplBody, setTplBody] = useState("");
  const [tplSample1, setTplSample1] = useState("");
  const [tplSample2, setTplSample2] = useState("");

  // Template Manager Filter & Test States
  const [templateFilter, setTemplateFilter] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">("ALL");
  const [templateSearch, setTemplateSearch] = useState("");
  const [isRefreshingTemplates, setIsRefreshingTemplates] = useState(false);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [testModalTemplate, setTestModalTemplate] = useState<WhatsAppTemplateItem | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testParam1, setTestParam1] = useState("Manoj");
  const [testParam2, setTestParam2] = useState("Masterclass");
  const [testParam3, setTestParam3] = useState("₹1");
  const [testParam4, setTestParam4] = useState("https://tysonpe.com");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // New Lead Modal State
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [newLeadAmount, setNewLeadAmount] = useState("");

  // Bulk Lead Upload & Outreach Campaign State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"csv" | "paste">("csv");
  const [pastedText, setPastedText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<BulkLeadRow[]>([]);
  const [uploadStage, setUploadStage] = useState<string>("NEW");
  const [sendOutreachNow, setSendOutreachNow] = useState(false);
  const [selectedOutreachTemplate, setSelectedOutreachTemplate] = useState<string>("");
  const [outreachParam1, setOutreachParam1] = useState("{{name}}");
  const [outreachParam2, setOutreachParam2] = useState("Masterclass");
  const [outreachParam3, setOutreachParam3] = useState("₹1");
  const [outreachParam4, setOutreachParam4] = useState("https://tysonpe.com");
  const [isUploadingLeads, setIsUploadingLeads] = useState(false);

  const showToast = (text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleRefreshTemplates = () => {
    setIsRefreshingTemplates(true);
    startTransition(async () => {
      const res = await getTemplatesAction();
      setIsRefreshingTemplates(false);
      if (res.ok && res.templates) {
        setTemplates(res.templates);
        showToast("Templates refreshed from Meta!");
      } else {
        showToast(res.error || "Failed to refresh templates", false);
      }
    });
  };

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTemplateId(id);
      setTimeout(() => setCopiedTemplateId(null), 1800);
    }
  };

  const handleDeleteTemplate = (name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}" from Meta?`)) return;
    startTransition(async () => {
      const res = await deleteTemplateAction(name);
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.name !== name));
        showToast(`Template "${name}" deleted from Meta`);
      } else {
        showToast(res.error || "Failed to delete template", false);
      }
    });
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testModalTemplate) return;
    if (!testPhone.trim()) {
      showToast("Please enter a recipient phone number", false);
      return;
    }
    setIsSendingTest(true);
    const params = [testParam1, testParam2, testParam3, testParam4].filter(Boolean);
    const res = await testSendTemplateAction({
      phone: testPhone,
      templateName: testModalTemplate.name,
      parameters: params,
    });
    setIsSendingTest(false);
    if (res.ok) {
      showToast(`Test WhatsApp message sent to ${testPhone}!`);
      setTestModalTemplate(null);
    } else {
      showToast(res.error || "Failed to send test message", false);
    }
  };

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (inboxFilter === "PAUSED" && !l.botPaused) return false;
      if (inboxFilter === "ABANDONED" && l.status !== "NEW") return false;
      if (inboxFilter === "INQUIRY" && l.status !== "INQUIRY") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = l.name?.toLowerCase().includes(q);
        const matchPhone = l.phone.includes(q);
        const matchIntent = l.intent?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchIntent) return false;
      }
      return true;
    });
  }, [leads, inboxFilter, searchQuery]);

  const handleSendMessage = () => {
    if (!selectedLead || !chatInput.trim()) return;
    const textToSend = chatInput.trim();
    setChatInput("");

    // Optimistically update
    const tempMsg = {
      id: `temp_${Date.now()}`,
      direction: "OUTBOUND",
      sender: "CREATOR",
      body: textToSend,
      status: "SENT",
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedLead.id
          ? { ...l, messages: [...l.messages, tempMsg], updatedAt: new Date().toISOString() }
          : l
      )
    );

    startTransition(async () => {
      const res = await sendDirectMessageAction(selectedLead.id, textToSend);
      if (!res.ok) {
        showToast(res.error || "Failed to send message", false);
      } else {
        showToast(res.metaStatus ? "Sent via Meta WhatsApp" : "Saved in thread (Sandbox Mode)");
      }
    });
  };

  const handleToggleBot = (leadId: string, currentPaused: boolean) => {
    const nextPaused = !currentPaused;
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, botPaused: nextPaused } : l))
    );

    startTransition(async () => {
      const res = await toggleBotPausedAction(leadId, nextPaused);
      if (!res.ok) {
        showToast("Failed to update bot status", false);
      } else {
        showToast(nextPaused ? "AI Paused — Human Takeover Active" : "AI Resumed — Auto-Replying");
      }
    });
  };

  const handleUpdateStatus = (leadId: string, newStatus: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    startTransition(async () => {
      const res = await updateLeadStatusAction(leadId, newStatus);
      if (!res.ok) showToast("Failed to update status", false);
      else showToast(`Moved to ${newStatus}`);
    });
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadPhone) return;

    startTransition(async () => {
      const res = await createLeadAction({
        phone: newLeadPhone,
        name: newLeadName,
        notes: newLeadNotes,
        quoteAmount: newLeadAmount ? parseInt(newLeadAmount, 10) : undefined,
      });

      if (res.ok && res.lead) {
        const fullLead: LeadItem = {
          ...res.lead,
          messages: [],
        };
        setLeads((prev) => [fullLead, ...prev]);
        setSelectedLeadId(fullLead.id);
        setShowNewLeadModal(false);
        setNewLeadPhone("");
        setNewLeadName("");
        setNewLeadNotes("");
        setNewLeadAmount("");
        showToast("Lead added successfully");
      } else {
        showToast(res.error || "Failed to create lead", false);
      }
    });
  };

  const parseRawContacts = (rawText: string): BulkLeadRow[] => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results: BulkLeadRow[] = [];
    const startIndex = lines.length > 0 && /phone|mobile|number|contact/i.test(lines[0]) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.includes(";")
        ? line.split(";")
        : line.split(",");

      const rawPhone = (parts[0] || "").trim();
      const rawName = (parts[1] || "").trim();
      const rawIntent = (parts[2] || "").trim();
      const rawAmount = (parts[3] || "").trim();

      const digits = rawPhone.replace(/\D/g, "");
      if (digits.length >= 8) {
        results.push({
          phone: digits,
          name: rawName || undefined,
          intent: rawIntent || undefined,
          quoteAmount: rawAmount && !isNaN(Number(rawAmount)) ? Number(rawAmount) : undefined,
        });
      }
    }
    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseRawContacts(content);
      setParsedLeads(parsed);
      if (parsed.length === 0) {
        showToast("No valid phone numbers found in file. Please ensure column 1 contains phone numbers.", false);
      } else {
        showToast(`Parsed ${parsed.length} contacts from CSV!`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sampleContent =
      "phone,name,intent,quote_amount\n" +
      "+919876543210,Rahul Sharma,Inquired about 30-Day Masterclass,4999\n" +
      "+919812345678,Pooja Verma,Abandoned checkout on Storefront,1999\n" +
      "917619671728,Aakash Singh,Requested 1:1 Consultation,999\n";
    const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "tysonpe_leads_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = () => {
    const leadsToImport = uploadMode === "paste" ? parseRawContacts(pastedText) : parsedLeads;
    if (leadsToImport.length === 0) {
      showToast("Please provide at least one contact with a valid phone number", false);
      return;
    }

    setIsUploadingLeads(true);
    startTransition(async () => {
      const params = [outreachParam1, outreachParam2, outreachParam3, outreachParam4].filter(Boolean);
      const res = await importBulkLeadsAction({
        leads: leadsToImport,
        status: uploadStage,
        sendTemplateName: sendOutreachNow ? selectedOutreachTemplate : undefined,
        templateParameters: sendOutreachNow ? params : undefined,
      });

      setIsUploadingLeads(false);
      if (res.ok && res.leads) {
        const newLeadsMap = new Map<string, LeadItem>(leads.map((l) => [l.phone, l]));
        for (const imported of res.leads as unknown as LeadItem[]) {
          newLeadsMap.set(imported.phone, imported);
        }
        const updatedList = Array.from(newLeadsMap.values()).sort(
          (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
        setLeads(updatedList);
        if (res.leads[0]) setSelectedLeadId(res.leads[0].id);
        setShowUploadModal(false);
        setPastedText("");
        setParsedLeads([]);
        if (res.sentCount && res.sentCount > 0) {
          showToast(`Imported ${res.importedCount} leads & sent ${res.sentCount} WhatsApp template messages!`);
        } else {
          showToast(`Imported ${res.importedCount} leads into ${uploadStage} pipeline!`);
        }
      } else {
        showToast(res.error || "Failed to import leads", false);
      }
    });
  };

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName || !tplBody) return;

    const samples: string[] = [];
    if (tplSample1) samples.push(tplSample1);
    if (tplSample2) samples.push(tplSample2);

    startTransition(async () => {
      const res = await submitTemplateAction({
        name: tplName,
        category: tplCategory,
        language: "en_US",
        bodyText: tplBody,
        sampleValues: samples,
      });

      if (res.ok) {
        const newTpl: WhatsAppTemplateItem = {
          id: res.templateId || `tpl_${Date.now()}`,
          name: tplName.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          category: tplCategory,
          status: (res.status as WhatsAppTemplateItem["status"]) || "PENDING",
          language: "en_US",
          components: [{ type: "BODY", text: tplBody }],
        };
        setTemplates((prev) => [newTpl, ...prev]);
        setTplName("");
        setTplBody("");
        setTplSample1("");
        setTplSample2("");
        showToast("Template submitted to Meta for approval!");
      } else {
        showToast(res.error || "Failed to submit template", false);
      }
    });
  };

  const { approvedCount, pendingCount, rejectedCount } = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const t of templates) {
      if (t.status === "APPROVED") approved++;
      else if (t.status === "PENDING") pending++;
      else if (t.status === "REJECTED") rejected++;
    }
    return { approvedCount: approved, pendingCount: pending, rejectedCount: rejected };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (templateFilter !== "ALL" && tpl.status !== templateFilter) return false;
      if (templateSearch.trim()) {
        const q = templateSearch.toLowerCase();
        const bodyText = tpl.components?.find((c) => c.type === "BODY")?.text?.toLowerCase() || "";
        if (!tpl.name.toLowerCase().includes(q) && !bodyText.includes(q)) return false;
      }
      return true;
    });
  }, [templates, templateFilter, templateSearch]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Header & Meta Connection Pill */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-ink font-display">
              WhatsApp Sales & AI CRM
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Meta Cloud API
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Automated WhatsApp AI sales, cart recovery, and 2-way human takeover for @{creatorHandle}.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs shadow-2xs">
            <span className="text-[11px] font-mono text-ink font-semibold">
              {accountStatus.displayPhoneNumber || "+91 63606 81493"}
            </span>
            <span className="text-[10px] text-muted">Tier 250</span>
          </div>

          <button
            onClick={() => {
              const approvedTpl = templates.find((t) => t.status === "APPROVED")?.name || "";
              setSelectedOutreachTemplate(approvedTpl);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-2xs transition-all duration-150 active:scale-[0.98] hover:bg-surface-2"
          >
            <svg
              className="h-3.5 w-3.5 text-brand"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowNewLeadModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-brand-ink shadow-xs transition-all duration-150 active:scale-[0.98] hover:bg-brand/90"
          >
            <span>+ Add Lead</span>
          </button>
        </div>
      </div>

      {/* Streamlined Metrics Ribbon (Glanceable, High-Density, Non-Intrusive) */}
      <div className="rounded-xl border border-line bg-surface p-3 shadow-2xs grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line/60">
        <div className="px-3 py-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Pipeline Leads</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-extrabold tracking-tight text-ink tabular-nums">{leads.length}</span>
            <span className="text-[11px] text-muted">contacts</span>
          </div>
        </div>

        <div className="px-3 py-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">AI Resolution</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-extrabold tracking-tight text-emerald-600 tabular-nums">
              {leads.filter((l) => l.status === "INQUIRY" || l.status === "INTERESTED").length}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">94% automated</span>
          </div>
        </div>

        <div className="px-3 py-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Active Pipeline Value</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-extrabold tracking-tight text-brand tabular-nums font-mono">
              ₹{leads.reduce((acc, curr) => acc + (curr.quoteAmount || 0), 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-muted">deal value</span>
          </div>
        </div>

        <div className="px-3 py-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Human Takeovers</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-extrabold tracking-tight text-ink tabular-nums">
              {leads.filter((l) => l.botPaused).length}
            </span>
            <span className="text-[11px] text-muted">
              {leads.some((l) => l.botPaused) ? "Manual takeover active" : "Bot handling replies"}
            </span>
          </div>
        </div>
      </div>

      {/* Skiper UI Segmented Control Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl bg-surface-2 p-1 border border-line/60">
          {[
            { id: "inbox", label: "Live Chat", count: leads.length },
            { id: "pipeline", label: "Deals Pipeline", count: leads.length },
            { id: "templates", label: "Meta Templates", count: approvedCount },
            { id: "settings", label: "Automation Rules" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => startTransition(() => setTab(t.id as typeof tab))}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                tab === t.id
                  ? "bg-surface text-ink font-bold shadow-xs border border-line/80"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    tab === t.id
                      ? "bg-brand/10 text-brand font-bold"
                      : "bg-line/60 text-muted"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: INBOX & 2-WAY LIVE CHAT */}
      {tab === "inbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-line bg-surface overflow-hidden shadow-xs h-[640px]">
          {/* Left Column: Leads & Conversations Drawer */}
          <div className="lg:col-span-4 border-r border-line flex flex-col bg-surface overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-line space-y-2 bg-surface">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search leads by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <svg
                  className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex gap-1 overflow-x-auto text-[11px] pb-0.5">
                {[
                  { key: "ALL", label: "All" },
                  { key: "INQUIRY", label: "Inquiries" },
                  { key: "PAUSED", label: "Takeover" },
                  { key: "ABANDONED", label: "Cart Drop" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setInboxFilter(f.key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                      inboxFilter === f.key
                        ? "bg-surface-2 text-ink font-bold border border-line/70 shadow-2xs"
                        : "text-muted hover:text-ink hover:bg-surface-2/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-line/40">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No conversations match your filter.
                </div>
              ) : (
                filteredLeads.map((l) => {
                  const isSelected = l.id === selectedLead?.id;
                  const lastMsg = l.messages[l.messages.length - 1];

                  return (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLeadId(l.id)}
                      className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 relative ${
                        isSelected
                          ? "bg-surface-2/80 text-ink"
                          : "hover:bg-surface-2/50"
                      }`}
                    >
                      {/* Active Left Indicator Accent */}
                      {isSelected && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
                      )}

                      <div className="h-8 w-8 shrink-0 rounded-full bg-brand-soft text-brand font-bold text-xs flex items-center justify-center border border-brand/20">
                        {(l.name || l.phone).slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-bold text-ink">
                            {l.name || `+${l.phone}`}
                          </p>
                          {l.botPaused ? (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-1.5 py-0.2 text-[9px] font-bold">
                              Human
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted font-mono">
                              {lastMsg
                                ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          )}
                        </div>

                        <p className="truncate text-[11px] text-muted mt-0.5">
                          {lastMsg ? lastMsg.body : l.intent || "New Storefront Lead"}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded bg-line/60 px-1.5 py-0.2 text-[9px] font-semibold text-muted uppercase">
                            {l.status}
                          </span>
                          {l.quoteAmount && (
                            <span className="text-[10px] font-mono font-bold text-brand">
                              ₹{l.quoteAmount.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation Stream & Composer */}
          <div className="lg:col-span-8 flex flex-col bg-bg overflow-hidden">
            {selectedLead ? (
              <>
                {/* Chat Top Bar */}
                <div className="border-b border-line bg-surface p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-brand-soft text-brand font-bold text-xs flex items-center justify-center border border-brand/20">
                      {(selectedLead.name || selectedLead.phone).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-ink leading-tight">
                          {selectedLead.name || `Lead +${selectedLead.phone}`}
                        </p>
                        <span className="font-mono text-[11px] text-muted">+{selectedLead.phone}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                        <span>Pipeline:</span>
                        <select
                          value={selectedLead.status}
                          onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
                          className="rounded border border-line bg-surface px-1.5 py-0.5 font-semibold text-ink text-[10px]"
                        >
                          {PIPELINE_COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Mode Switcher: AI Bot vs Human Takeover */}
                  <div className="flex items-center gap-2">
                    {selectedLead.botPaused ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-1 rounded-lg border border-amber-200/60 inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Human Takeover
                        </span>
                        <button
                          onClick={() => handleToggleBot(selectedLead.id, selectedLead.botPaused)}
                          className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink transition-all active:scale-[0.98] hover:bg-brand/90"
                        >
                          Resume AI Bot
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-200/60 inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          AI Autopilot
                        </span>
                        <button
                          onClick={() => handleToggleBot(selectedLead.id, selectedLead.botPaused)}
                          className="rounded-lg border border-line bg-surface hover:bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink transition-all active:scale-[0.98]"
                        >
                          Take Over
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtle Meta 24-hr Window Indicator */}
                <div className="border-b border-line/60 bg-surface-2/40 px-4 py-1 flex items-center justify-between text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <strong>24-Hour Service Window Open:</strong> Freeform two-way messaging active.
                  </span>
                  <span className="font-mono text-[10px]">Meta Cloud API</span>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg/50">
                  {selectedLead.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-xs text-muted space-y-2">
                      <p className="font-semibold text-ink">No messages in this conversation yet</p>
                      <p className="text-[11px] text-muted">Send a personalized greeting or quick checkout link below.</p>
                    </div>
                  ) : (
                    selectedLead.messages.map((m) => {
                      const isCustomer = m.direction === "INBOUND" || m.sender === "CUSTOMER";
                      const isBot = m.sender === "BOT";

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${
                              isCustomer
                                ? "bg-surface border border-line text-ink rounded-bl-xs"
                                : isBot
                                ? "bg-brand-soft/70 border border-brand/20 text-ink rounded-br-xs"
                                : "bg-brand text-brand-ink rounded-br-xs"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                              <span className="font-bold">
                                {isCustomer
                                  ? selectedLead.name || "Customer"
                                  : isBot
                                  ? "🤖 AI Sales Agent"
                                  : "👤 You"}
                              </span>
                              <span className="font-mono">
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick-Action Shortcuts Bar */}
                <div className="border-t border-line/60 bg-surface px-3 py-1.5 flex gap-1.5 overflow-x-auto text-[11px]">
                  <span className="text-[10px] font-bold text-muted self-center uppercase tracking-wider pr-1">
                    Quick Insert:
                  </span>
                  {[
                    {
                      label: "⚡ 10% Discount",
                      text: `Hi ${selectedLead.name || ""}! Here is an exclusive 10% discount: Use code SAVE10 on checkout: https://tysonpe.com/c/${creatorHandle}`,
                    },
                    {
                      label: "💳 UPI Pay Link",
                      text: `You can complete your payment securely via UPI (GPay/PhonePe/Paytm) here: https://tysonpe.com/c/${creatorHandle}`,
                    },
                    {
                      label: "📅 Book 1:1 Call",
                      text: "Would you like to hop on a quick 15-minute call today to go over the course curriculum?",
                    },
                    {
                      label: "❓ Course Outline",
                      text: "The program includes video lessons, downloadable templates, and private community access.",
                    },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setChatInput(s.text)}
                      className="rounded-lg border border-line/80 bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink whitespace-nowrap hover:bg-line transition-all active:scale-[0.98]"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Live Message Composer */}
                <div className="border-t border-line bg-surface p-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Type a WhatsApp reply to ${selectedLead.name || "lead"} (Enter to send)...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 rounded-xl border border-line bg-bg px-3.5 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    disabled={isPending || !chatInput.trim()}
                    onClick={handleSendMessage}
                    className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-ink transition-all duration-150 active:scale-[0.98] disabled:opacity-50 hover:bg-brand/90 flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 7-7 7 7M12 5v14" transform="rotate(90 12 12)" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-xs text-muted">
                Select a lead from the left to view WhatsApp conversation history.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KANBAN PIPELINE */}
      {tab === "pipeline" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.key);

            return (
              <div
                key={col.key}
                className="flex flex-col rounded-2xl border border-line bg-surface p-3 min-h-[460px] shadow-2xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-line/60 pb-2.5 mb-3">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-muted">{colLeads.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {colLeads.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-muted">No leads in stage</div>
                  ) : (
                    colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="rounded-xl border border-line bg-bg p-3 shadow-2xs hover:border-brand/40 transition-colors"
                      >
                        <p className="text-xs font-bold text-ink">
                          {lead.name || `+${lead.phone}`}
                        </p>
                        <p className="text-[10px] text-muted font-mono mt-0.5">+{lead.phone}</p>

                        {lead.intent && (
                          <p className="mt-1.5 text-[11px] text-muted line-clamp-2">
                            {lead.intent}
                          </p>
                        )}

                        {lead.quoteAmount && (
                          <p className="mt-2 text-xs font-bold font-mono text-brand">
                            ₹{lead.quoteAmount.toLocaleString("en-IN")}
                          </p>
                        )}

                        {/* Quick Move Action */}
                        <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setTab("inbox");
                            }}
                            className="text-[10px] font-semibold text-brand hover:underline"
                          >
                            Open Chat →
                          </button>

                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                            className="text-[9px] rounded border border-line bg-surface px-1 py-0.5"
                          >
                            {PIPELINE_COLUMNS.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: META TEMPLATES & APPROVALS COMMAND CENTER */}
      {tab === "templates" && (
        <div className="space-y-6">
          {/* Top Stat Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Total Templates
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-display text-ink tabular-nums">
                  {templates.length}
                </span>
                <span className="text-[10px] font-semibold text-muted font-mono">
                  Applied to Meta
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Approved & Live
                </span>
                <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
                  {approvedCount}
                </span>
                <span className="rounded-md bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  Ready to Send
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  In Meta Review
                </span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-display text-amber-700 tabular-nums">
                  {pendingCount}
                </span>
                <span className="rounded-md bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  ~2-5 min review
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Needs Changes
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-display text-rose-700 tabular-nums">
                  {rejectedCount}
                </span>
                <span className="rounded-md bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                  Rejected
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Template Submission Form */}
            <div className="lg:col-span-5 rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-ink font-display">
                  Apply for New Meta Template
                </h2>
                <p className="mt-0.5 text-xs text-muted leading-relaxed">
                  Submit pre-approved message templates for outbound broadcasts and notifications. Meta automatically reviews Utility templates in 2–5 minutes.
                </p>
              </div>

              <form onSubmit={handleSubmitTemplate} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Template Identifier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. course_enrollment_notice_v1"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                    required
                  />
                  <span className="text-[10px] text-muted">Lowercase letters, numbers, and underscores only</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Category
                  </label>
                  <select
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value as "UTILITY" | "MARKETING")}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="UTILITY">Utility (Order updates, confirmations — fast 2-min review)</option>
                    <option value="MARKETING">Marketing (Promotions, discounts, broadcasts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Message Body (with variables)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Hello {{1}}, your order for {{2}} is confirmed! Total: {{3}}. Access link: {{4}} - Team Tysonpe."
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand font-sans"
                    required
                  />
                  <p className="mt-1 text-[10px] text-muted">
                    Meta Rule: Variables like <code className="font-mono text-brand">{"{{1}}"}</code> cannot be at the very start or end of the text.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                      Sample for {"{{1}}"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul"
                      value={tplSample1}
                      onChange={(e) => setTplSample1(e.target.value)}
                      className="w-full rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                      Sample for {"{{2}}"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Masterclass"
                      value={tplSample2}
                      onChange={(e) => setTplSample2(e.target.value)}
                      className="w-full rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-muted"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending || !tplName || !tplBody}
                  className="w-full rounded-xl bg-brand py-2.5 text-xs font-semibold text-brand-ink transition-all duration-150 active:scale-[0.98] disabled:opacity-50 hover:bg-brand/90 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin text-brand-ink" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Submitting to Meta API...</span>
                    </>
                  ) : (
                    <span>Submit to Meta for Approval →</span>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Templates Status & Management Command Center */}
            <div className="lg:col-span-7 rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-4 flex flex-col">
              {/* Header with Account Information */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-ink font-display">
                      All Applied Templates & Statuses
                    </h2>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wide">
                      Live Account
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {accountStatus.verifiedName || "KBD Credit Solutions"} • {accountStatus.displayPhoneNumber || "+91 63606 81493"} • WABA {accountStatus.wabaId || "1337165675241639"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshTemplates}
                  disabled={isRefreshingTemplates}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-semibold text-ink transition-all duration-150 active:scale-[0.98] hover:border-brand/40"
                  title="Refresh template statuses directly from Meta"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-muted transition-transform ${
                      isRefreshingTemplates ? "animate-spin text-brand" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>{isRefreshingTemplates ? "Refreshing..." : "Refresh from Meta"}</span>
                </button>
              </div>

              {/* Filter Tabs and Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Status Segmented Control */}
                <div className="inline-flex rounded-xl border border-line bg-bg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTemplateFilter("ALL")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all duration-150 ${
                      templateFilter === "ALL"
                        ? "bg-surface text-ink shadow-2xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    All ({templates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFilter("APPROVED")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all duration-150 ${
                      templateFilter === "APPROVED"
                        ? "bg-emerald-50 text-emerald-800 shadow-2xs border border-emerald-200/50"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Approved ({approvedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFilter("PENDING")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all duration-150 ${
                      templateFilter === "PENDING"
                        ? "bg-amber-50 text-amber-800 shadow-2xs border border-amber-200/50"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  {rejectedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setTemplateFilter("REJECTED")}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition-all duration-150 ${
                        templateFilter === "REJECTED"
                          ? "bg-rose-50 text-rose-800 shadow-2xs border border-rose-200/50"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Rejected ({rejectedCount})
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <svg
                    className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Template Items List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[580px] pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="rounded-xl border border-line/60 bg-bg/50 p-8 text-center">
                    <p className="text-xs font-semibold text-ink">No templates found</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {templateFilter !== "ALL"
                        ? `No templates currently in "${templateFilter}" state.`
                        : "No templates submitted yet. Create one using the form on the left."}
                    </p>
                    {templateFilter !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => setTemplateFilter("ALL")}
                        className="mt-3 inline-flex rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-brand/40"
                      >
                        Show All Templates
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => {
                    const bodyText =
                      tpl.components?.find((c) => c.type === "BODY")?.text || "No body content";

                    return (
                      <div
                        key={tpl.id}
                        className="rounded-xl border border-line bg-bg/60 p-4 space-y-3 hover:border-brand/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold font-mono text-ink tracking-tight">
                                {tpl.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCopy(tpl.name, tpl.id)}
                                className="text-muted hover:text-ink transition-colors p-0.5 rounded"
                                title="Copy template name"
                              >
                                {copiedTemplateId === tpl.id ? (
                                  <svg className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-75 duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 text-muted hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted">
                              <span className="uppercase font-semibold tracking-wider">{tpl.category}</span>
                              <span>•</span>
                              <span>Language: {tpl.language}</span>
                              <span>•</span>
                              <span className="font-mono text-[9px] text-muted/70">ID: {tpl.id}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1.5">
                            {tpl.status === "APPROVED" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                APPROVED
                              </span>
                            )}
                            {tpl.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <svg className="w-3 h-3 text-amber-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                PENDING REVIEW
                              </span>
                            )}
                            {tpl.status === "REJECTED" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                REJECTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Message Preview */}
                        <div className="rounded-lg bg-surface border border-line/60 p-3 text-xs text-ink leading-relaxed">
                          {bodyText}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted">
                            {tpl.status === "APPROVED"
                              ? "Ready for automated triggers & broadcasts"
                              : "Under Meta compliance evaluation"}
                          </span>

                          <div className="flex items-center gap-2">
                            {tpl.status === "APPROVED" && (
                              <button
                                type="button"
                                onClick={() => setTestModalTemplate(tpl)}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-brand/40 active:scale-[0.98] transition-all"
                              >
                                <svg className="w-3 h-3 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span>Test Send</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl.name)}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-muted hover:text-rose-600 hover:border-rose-200 active:scale-[0.98] transition-all"
                              title="Delete template from Meta"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Template Modal */}
      {testModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink font-display">
                  Test Send Template
                </h3>
                <p className="text-[11px] font-mono text-muted">
                  {testModalTemplate.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestModalTemplate(null)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTestSend} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 917619671728"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink font-mono"
                  required
                />
                <span className="text-[10px] text-muted">Include country code without + (e.g. 91...)</span>
              </div>

              {testModalTemplate.name !== "hello_world" && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Dynamic Parameters
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Param {{1}}"
                      value={testParam1}
                      onChange={(e) => setTestParam1(e.target.value)}
                      className="rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-ink"
                    />
                    <input
                      type="text"
                      placeholder="Param {{2}}"
                      value={testParam2}
                      onChange={(e) => setTestParam2(e.target.value)}
                      className="rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-ink"
                    />
                    <input
                      type="text"
                      placeholder="Param {{3}}"
                      value={testParam3}
                      onChange={(e) => setTestParam3(e.target.value)}
                      className="rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-ink"
                    />
                    <input
                      type="text"
                      placeholder="Param {{4}}"
                      value={testParam4}
                      onChange={(e) => setTestParam4(e.target.value)}
                      className="rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-ink"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalTemplate(null)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest || !testPhone}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-ink disabled:opacity-50 hover:bg-brand/90 transition-all active:scale-[0.98]"
                >
                  {isSendingTest ? "Sending via Meta..." : "Send Test WhatsApp →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* TAB 4: AUTOMATION SETTINGS */}
      {tab === "settings" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-ink font-display">
              WhatsApp Sales Agent Settings
            </h2>
            <p className="mt-1 text-xs text-muted">
              Configure automated abandoned cart triggers and business rules for @{creatorHandle}.
            </p>
          </div>

          <div className="space-y-4 divide-y divide-line/60">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink">Abandoned Checkout Auto-Recovery</p>
                <p className="text-[11px] text-muted">
                  Sends a WhatsApp template message 15 minutes after customer enters phone at checkout.
                </p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                Enabled
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink">24-Hour Service Window Auto-Responder</p>
                <p className="text-[11px] text-muted">
                  AI answers inquiries in English, Hindi, and Hinglish within the 24-hr customer window.
                </p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                Enabled
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink">Meta Cloud API Credentials</p>
                <p className="text-[11px] text-muted">
                  WABA ID: 2197739044402624 • Phone ID: 1298109926710710
                </p>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                Configured (.env)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showNewLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink font-display">Add New Lead</h3>
              <button
                onClick={() => setShowNewLeadModal(false)}
                className="text-xs text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Deal / Quote Value (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 4999"
                  value={newLeadAmount}
                  onChange={(e) => setNewLeadAmount(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Notes / Inquiry
                </label>
                <textarea
                  rows={2}
                  placeholder="Inquired about 1:1 mentorship"
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewLeadModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newLeadPhone}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-ink disabled:opacity-50"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Lead Upload & Outreach Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink font-display">
                  Upload Leads for Outreach
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Import prospective contacts into your pipeline and optionally launch automated WhatsApp template campaigns.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-muted hover:text-ink text-sm px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUploadMode("csv")}
                  className={`rounded-md px-3 py-1.5 transition-all ${
                    uploadMode === "csv"
                      ? "bg-surface text-ink shadow-2xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("paste")}
                  className={`rounded-md px-3 py-1.5 transition-all ${
                    uploadMode === "paste"
                      ? "bg-surface text-ink shadow-2xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Quick Paste Text
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-[11px] font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>↓ Download sample .csv</span>
              </button>
            </div>

            {/* Input Form Section */}
            {uploadMode === "csv" ? (
              <div className="rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-brand/50 transition-colors">
                <svg
                  className="mx-auto h-8 w-8 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <label className="mt-3 block cursor-pointer">
                  <span className="text-xs font-bold text-brand hover:underline">Click to browse file</span>
                  <span className="text-xs text-muted"> or drag and drop (.csv, .tsv, .txt)</span>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-[10px] text-muted">
                  Columns: phone, name, intent/notes, amount (Header row optional)
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Paste Phone Numbers & Names (One per line)
                </label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={
                    "9876543210, Rahul Sharma, Interested in Masterclass, 4999\n" +
                    "+91 98123 45678, Pooja Verma, Inquired about consultation\n" +
                    "917619671728, Aakash Singh"
                  }
                  className="w-full rounded-xl border border-line bg-bg p-3 font-mono text-xs text-ink placeholder:text-muted/60"
                />
                <p className="mt-1 text-[10px] text-muted">
                  Accepts formats: `Phone, Name, Intent` or just phone numbers. Indian 10-digit numbers automatically get prefixed with +91.
                </p>
              </div>
            )}

            {/* Preview of Parsed Contacts */}
            {((uploadMode === "csv" && parsedLeads.length > 0) ||
              (uploadMode === "paste" && parseRawContacts(pastedText).length > 0)) && (
              <div className="rounded-xl border border-line bg-surface-2/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-ink">
                    Detected Contacts:{" "}
                    <strong className="text-brand">
                      {uploadMode === "csv" ? parsedLeads.length : parseRawContacts(pastedText).length}
                    </strong>
                  </span>
                  <span className="badge badge-good text-[10px]">Valid Numbers Ready</span>
                </div>

                <div className="max-h-36 overflow-y-auto divide-y divide-line/40 text-[11px]">
                  {(uploadMode === "csv" ? parsedLeads : parseRawContacts(pastedText))
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink">+{item.phone}</span>
                          {item.name && <span className="text-muted">({item.name})</span>}
                        </div>
                        {item.intent && (
                          <span className="truncate max-w-[180px] text-muted italic">
                            {item.intent}
                          </span>
                        )}
                      </div>
                    ))}
                  {(uploadMode === "csv" ? parsedLeads.length : parseRawContacts(pastedText).length) > 5 && (
                    <p className="pt-1.5 text-center text-[10px] text-muted italic">
                      +{(uploadMode === "csv" ? parsedLeads.length : parseRawContacts(pastedText).length) - 5} more contacts
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Campaign & Pipeline Settings */}
            <div className="rounded-xl border border-line p-4 space-y-3 bg-surface">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Pipeline Target Stage
                  </label>
                  <select
                    value={uploadStage}
                    onChange={(e) => setUploadStage(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                  >
                    <option value="NEW">New (Uncontacted)</option>
                    <option value="INQUIRY">Inquiry / Consultation</option>
                    <option value="INTERESTED">Interested / Warm Lead</option>
                    <option value="QUOTE_SENT">Quote / Offer Sent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Instant Outreach Broadcast
                  </label>
                  <div className="flex items-center h-9">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={sendOutreachNow}
                        onChange={(e) => setSendOutreachNow(e.target.checked)}
                        className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                      />
                      <span>Send WhatsApp Template Now</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Outreach Template Options if checked */}
              {sendOutreachNow && (
                <div className="pt-3 border-t border-line space-y-3 bg-brand-soft/20 p-3 rounded-lg">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand mb-1">
                      Select Approved Meta Template
                    </label>
                    <select
                      value={selectedOutreachTemplate}
                      onChange={(e) => setSelectedOutreachTemplate(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink font-semibold"
                    >
                      {templates.filter((t) => t.status === "APPROVED").length === 0 ? (
                        <option value="">No approved templates found</option>
                      ) : (
                        templates
                          .filter((t) => t.status === "APPROVED")
                          .map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name} ({t.category})
                            </option>
                          ))
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Param 1 (e.g. Name)
                      </label>
                      <input
                        type="text"
                        value={outreachParam1}
                        onChange={(e) => setOutreachParam1(e.target.value)}
                        placeholder="{{name}}"
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs"
                      />
                      <span className="text-[9px] text-muted">Use {"{{name}}"} for recipient name</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Param 2 (e.g. Product)
                      </label>
                      <input
                        type="text"
                        value={outreachParam2}
                        onChange={(e) => setOutreachParam2(e.target.value)}
                        placeholder="Masterclass"
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Param 3 (e.g. Price/Offer)
                      </label>
                      <input
                        type="text"
                        value={outreachParam3}
                        onChange={(e) => setOutreachParam3(e.target.value)}
                        placeholder="₹1"
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Param 4 (e.g. Link)
                      </label>
                      <input
                        type="text"
                        value={outreachParam4}
                        onChange={(e) => setOutreachParam4(e.target.value)}
                        placeholder="https://tysonpe.com"
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted">
                {uploadMode === "csv"
                  ? `${parsedLeads.length} leads ready`
                  : `${parseRawContacts(pastedText).length} leads ready`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={
                    isUploadingLeads ||
                    (uploadMode === "csv" && parsedLeads.length === 0) ||
                    (uploadMode === "paste" && parseRawContacts(pastedText).length === 0)
                  }
                  className="rounded-xl bg-brand px-5 py-2 text-xs font-semibold text-brand-ink disabled:opacity-50 transition-all duration-150 active:scale-[0.98] shadow-xs hover:bg-brand/90 flex items-center gap-1.5"
                >
                  {isUploadingLeads ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-brand-ink border-t-transparent animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : sendOutreachNow ? (
                    <span>Import & Launch WhatsApp Campaign</span>
                  ) : (
                    <span>Import Leads to Pipeline</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
