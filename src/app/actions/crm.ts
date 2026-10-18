"use server";

import { db } from "@/lib/db";
import { requireCreator } from "@/lib/auth/session";
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  createWhatsAppTemplate,
  listWhatsAppTemplates,
  deleteWhatsAppTemplate,
  getWhatsAppAccountStatus,
  sanitizePhone,
} from "@/lib/whatsapp/client";
import type { CreateTemplateInput } from "@/lib/whatsapp/types";

export async function getLeadsAction(options?: {
  query?: string;
  status?: string;
}) {
  const { creator } = await requireCreator();

  const where: Record<string, unknown> = { creatorId: creator.id };

  if (options?.status && options.status !== "ALL") {
    where.status = options.status;
  }

  if (options?.query) {
    const q = options.query.trim();
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { intent: { contains: q } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return { ok: true, leads };
}

export async function getLeadDetailAction(leadId: string) {
  const { creator } = await requireCreator();

  const lead = await db.lead.findFirst({
    where: { id: leadId, creatorId: creator.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!lead) {
    return { ok: false, error: "Lead not found" };
  }

  return { ok: true, lead };
}

export async function updateLeadStatusAction(leadId: string, status: string) {
  const { creator } = await requireCreator();

  const validStatuses = [
    "NEW",
    "INQUIRY",
    "INTERESTED",
    "QUOTE_SENT",
    "CALLBACK",
    "BOOKED",
    "CLOSED",
  ];

  if (!validStatuses.includes(status)) {
    return { ok: false, error: "Invalid status value" };
  }

  const lead = await db.lead.updateMany({
    where: { id: leadId, creatorId: creator.id },
    data: { status },
  });

  if (lead.count === 0) {
    return { ok: false, error: "Lead not found" };
  }

  return { ok: true };
}

export async function toggleBotPausedAction(leadId: string, botPaused: boolean) {
  const { creator } = await requireCreator();

  const lead = await db.lead.updateMany({
    where: { id: leadId, creatorId: creator.id },
    data: { botPaused },
  });

  if (lead.count === 0) {
    return { ok: false, error: "Lead not found" };
  }

  return { ok: true, botPaused };
}

export async function sendDirectMessageAction(leadId: string, text: string) {
  const { creator } = await requireCreator();

  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Message cannot be empty" };
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, creatorId: creator.id },
  });

  if (!lead) {
    return { ok: false, error: "Lead not found" };
  }

  // Send through Meta WhatsApp Cloud API
  const apiResult = await sendWhatsAppText(lead.phone, trimmed);

  // Record outbound message in database
  const msg = await db.whatsAppMessage.create({
    data: {

      leadId: lead.id,
      creatorId: creator.id,
      direction: "OUTBOUND",
      sender: "CREATOR",
      body: trimmed,
      status: apiResult.success ? "SENT" : "FAILED",
      waMessageId: apiResult.messageId || null,
    },
  });

  // Touch lead's updatedAt
  await db.lead.update({
    where: { id: lead.id },
    data: { updatedAt: new Date() },
  });

  return {
    ok: true,
    message: msg,
    metaStatus: apiResult.success,
    metaError: apiResult.error,
  };
}

export async function createLeadAction(input: {
  phone: string;
  name?: string;
  notes?: string;
  intent?: string;
  status?: string;
  quoteAmount?: number;
}) {
  const { creator } = await requireCreator();

  const cleanedPhone = sanitizePhone(input.phone);
  if (!cleanedPhone || cleanedPhone.length < 8) {
    return { ok: false, error: "Valid phone number required" };
  }

  const lead = await db.lead.upsert({
    where: {
      creatorId_phone: {
        creatorId: creator.id,
        phone: cleanedPhone,
      },
    },
    update: {
      name: input.name || undefined,
      notes: input.notes || undefined,
      intent: input.intent || undefined,
      status: input.status || undefined,
      quoteAmount: input.quoteAmount !== undefined ? input.quoteAmount : undefined,
    },
    create: {
      creatorId: creator.id,
      phone: cleanedPhone,
      name: input.name || null,
      notes: input.notes || null,
      intent: input.intent || null,
      status: input.status || "NEW",
      quoteAmount: input.quoteAmount || null,
    },
  });

  return { ok: true, lead };
}

export interface BulkLeadRow {
  phone: string;
  name?: string;
  email?: string;
  intent?: string;
  notes?: string;
  quoteAmount?: number;
}

export async function importBulkLeadsAction(input: {
  leads: BulkLeadRow[];
  status?: string;
  sendTemplateName?: string;
  templateParameters?: string[];
}) {
  const { creator } = await requireCreator();

  if (!input.leads || input.leads.length === 0) {
    return { ok: false, error: "No leads provided to import" };
  }

  const validLeads: BulkLeadRow[] = [];
  const seenPhones = new Set<string>();

  for (const row of input.leads) {
    const cleaned = sanitizePhone(row.phone);
    if (cleaned && cleaned.length >= 8 && !seenPhones.has(cleaned)) {
      seenPhones.add(cleaned);
      validLeads.push({
        ...row,
        phone: cleaned,
      });
    }
  }

  if (validLeads.length === 0) {
    return { ok: false, error: "No valid phone numbers found in the uploaded list" };
  }

  const importedLeads = [];
  let sentCount = 0;

  for (const item of validLeads) {
    const lead = await db.lead.upsert({
      where: {
        creatorId_phone: {
          creatorId: creator.id,
          phone: item.phone,
        },
      },
      update: {
        name: item.name || undefined,
        email: item.email || undefined,
        intent: item.intent || undefined,
        notes: item.notes || undefined,
        status: input.status || undefined,
        quoteAmount: item.quoteAmount !== undefined ? item.quoteAmount : undefined,
      },
      create: {
        creatorId: creator.id,
        phone: item.phone,
        name: item.name || null,
        email: item.email || null,
        intent: item.intent || null,
        notes: item.notes || null,
        status: input.status || "NEW",
        quoteAmount: item.quoteAmount || null,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // If an approved template was specified for instant outreach
    if (input.sendTemplateName) {
      const params = (input.templateParameters || []).map((p) =>
        p.replace(/{{name}}/gi, lead.name || "there")
      );

      const sendResult = await sendWhatsAppTemplate(
        lead.phone,
        input.sendTemplateName,
        "en_US",
        params
      );

      if (sendResult.success) {
        sentCount++;
        const msg = await db.whatsAppMessage.create({
          data: {
            leadId: lead.id,
            creatorId: creator.id,
            direction: "OUTBOUND",
            sender: "CREATOR",
            body: `[Template: ${input.sendTemplateName}]`,
            msgType: "template",
            templateName: input.sendTemplateName,
            waMessageId: sendResult.messageId || null,
            status: "SENT",
          },
        });
        lead.messages.push(msg);
      }
    }

    importedLeads.push(lead);
  }

  return {
    ok: true,
    importedCount: importedLeads.length,
    sentCount,
    leads: importedLeads,
  };
}

export async function submitTemplateAction(input: CreateTemplateInput) {
  await requireCreator();

  if (!input.name || !input.bodyText) {
    return { ok: false, error: "Template name and body text are required" };
  }

  const result = await createWhatsAppTemplate(input);

  if (!result.success) {
    return { ok: false, error: result.error || "Failed to submit template to Meta" };
  }

  return {
    ok: true,
    templateId: result.templateId,
    status: result.status,
  };
}

export async function getTemplatesAction() {
  await requireCreator();
  const res = await listWhatsAppTemplates();
  return { ok: !res.error, templates: res.templates, error: res.error };
}

export async function deleteTemplateAction(name: string) {
  await requireCreator();
  const res = await deleteWhatsAppTemplate(name);
  return { ok: res.success, error: res.error };
}

export async function testSendTemplateAction(input: {
  phone: string;
  templateName: string;
  parameters?: string[];
}) {
  await requireCreator();
  const cleaned = sanitizePhone(input.phone);
  if (!cleaned || cleaned.length < 8) {
    return { ok: false, error: "Valid recipient phone number is required" };
  }
  const res = await sendWhatsAppTemplate(
    cleaned,
    input.templateName,
    "en_US",
    input.parameters || []
  );
  return { ok: res.success, messageId: res.messageId, error: res.error };
}

export async function getWhatsAppStatusAction() {
  await requireCreator();
  const status = await getWhatsAppAccountStatus();
  return { ok: true, status };
}
