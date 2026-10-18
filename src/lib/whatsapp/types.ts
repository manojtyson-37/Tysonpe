export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
export type TemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";

export interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: {
    body_text?: string[][];
  };
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WhatsAppTemplateItem {
  id: string;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
}

export interface CreateTemplateInput {
  name: string;
  category: TemplateCategory;
  language?: string;
  bodyText: string;
  sampleValues?: string[];
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppAccountInfo {
  connected: boolean;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  messagingLimitTier?: string;
  wabaId?: string;
  error?: string;
}
