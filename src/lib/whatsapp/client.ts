import type {
  WhatsAppTemplateItem,
  CreateTemplateInput,
  SendMessageResult,
  WhatsAppAccountInfo,
} from "./types";

const GRAPH_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const isConfigured = Boolean(token && phoneNumberId);
  return { token, phoneNumberId, wabaId, isConfigured };
}

/**
 * Clean phone number to digits only, with standard international format
 */
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`; // default Indian numbers without country code
  return digits;
}

/**
 * Fetch WhatsApp phone number and business account health status from Meta
 */
export async function getWhatsAppAccountStatus(): Promise<WhatsAppAccountInfo> {
  const { token, phoneNumberId, wabaId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) {
    return {
      connected: false,
      error: "WhatsApp API credentials not configured in environment.",
    };
  }

  try {
    const res = await fetch(
      `${BASE_URL}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status,messaging_limit_tier`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        connected: false,
        phoneNumberId,
        wabaId,
        error: errData.error?.message || `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      connected: data.status === "CONNECTED",
      phoneNumberId,
      wabaId,
      displayPhoneNumber: data.display_phone_number || "",
      verifiedName: data.verified_name || "Test Number",
      qualityRating: data.quality_rating || "GREEN",
      messagingLimitTier: data.messaging_limit_tier || "TIER_250",
    };
  } catch (err) {
    return {
      connected: false,
      phoneNumberId,
      wabaId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * List message templates from Meta Graph API
 */
export async function listWhatsAppTemplates(): Promise<{
  templates: WhatsAppTemplateItem[];
  error?: string;
}> {
  const { token, wabaId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured || !wabaId) {
    return {
      templates: [],
      error: "WhatsApp WABA ID or Access Token missing",
    };
  }

  try {
    const res = await fetch(
      `${BASE_URL}/${wabaId}/message_templates?limit=50&fields=id,name,status,category,language,components`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        templates: [],
        error: err.error?.message || `Failed to fetch templates: HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return { templates: data.data || [] };
  } catch (err) {
    return {
      templates: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Submit a new template to Meta for automated approval review via API
 */
export async function createWhatsAppTemplate(
  input: CreateTemplateInput
): Promise<{ success: boolean; templateId?: string; status?: string; error?: string }> {
  const { token, wabaId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured || !wabaId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const sanitizedName = input.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 512);

  const bodyComponent: Record<string, unknown> = {
    type: "BODY",
    text: input.bodyText,
  };

  if (input.sampleValues && input.sampleValues.length > 0) {
    bodyComponent.example = {
      body_text: [input.sampleValues],
    };
  }

  const payload = {
    name: sanitizedName,
    language: input.language || "en_US",
    category: input.category,
    components: [bodyComponent],
  };

  try {
    const res = await fetch(`${BASE_URL}/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `Failed to submit template (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      templateId: data.id,
      status: data.status || "PENDING",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Delete a template via Meta Graph API
 */
export async function deleteWhatsAppTemplate(
  name: string
): Promise<{ success: boolean; error?: string }> {
  const { token, wabaId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured || !wabaId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  try {
    const res = await fetch(
      `${BASE_URL}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || "Failed to delete template" };
    }

    return { success: data.success ?? true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send a freeform text message (valid within 24-hr customer service window)
 */
export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<SendMessageResult> {
  const { token, phoneNumberId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) {
    // In dev / test without live credentials, return mock success
    return { success: true, messageId: `mock_wamid_${Date.now()}` };
  }

  const recipient = sanitizePhone(to);

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { preview_url: true, body: text },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${res.status}`,
      };
    }

    const messageId = data.messages?.[0]?.id || "";
    return { success: true, messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Send an approved pre-registered template message (for outbound broadcasts & abandoned cart alerts)
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode = "en_US",
  bodyParameters: string[] = []
): Promise<SendMessageResult> {
  const { token, phoneNumberId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) {
    return { success: true, messageId: `mock_tpl_wamid_${Date.now()}` };
  }

  const recipient = sanitizePhone(to);

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (bodyParameters.length > 0) {
    (payload.template as Record<string, unknown>).components = [
      {
        type: "body",
        parameters: bodyParameters.map((val) => ({
          type: "text",
          text: val,
        })),
      },
    ];
  }

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${res.status}`,
      };
    }

    const messageId = data.messages?.[0]?.id || "";
    return { success: true, messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
