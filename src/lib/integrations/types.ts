export type WebhookEventName =
  | "order.paid"
  | "order.refunded"
  | "lead.created"
  | "enrollment.created"
  | "course.completed";

export interface CreatorWebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventName[];
  enabled: boolean;
  createdAt: string;
  lastFiredAt?: string;
  lastStatus?: number;
  lastError?: string;
}

export interface TrackingPixelsConfig {
  metaPixelId?: string;
  googleAnalyticsId?: string; // G-XXXXXXXXXX
  gtmContainerId?: string; // GTM-XXXXXX
  enabled: boolean;
}

export interface LiveClassConfig {
  defaultProvider: "zoom" | "google_meet" | "youtube_live";
  meetingUrl?: string;
  meetingPassword?: string;
  instructions?: string;
}

export interface EmailMarketingConfig {
  provider: "none" | "convertkit" | "mailchimp" | "brevo" | "activecampaign";
  apiKey?: string;
  audienceId?: string;
  tag?: string;
  autoSyncLearners: boolean;
  enabled?: boolean;
  lastSyncedAt?: string;
}

export interface TelegramConfig {
  channelUrl?: string;
  groupName?: string;
  autoInviteOnPurchase: boolean;
}

export interface GoogleSheetsConfig {
  spreadsheetId?: string;
  sheetName?: string;
  syncOnOrder: boolean;
  syncOnLead: boolean;
  enabled: boolean;
  lastSyncedAt?: string;
}

export interface DiscordConfig {
  webhookUrl?: string;
  serverInviteUrl?: string;
  botEnabled: boolean;
  autoNotifyOnPurchase: boolean;
  lastFiredAt?: string;
}

export interface SmsConfig {
  provider: "fast2sms" | "msg91";
  senderId?: string;
  apiKey?: string;
  sendOtp: boolean;
  sendOrderConfirmation: boolean;
  enabled: boolean;
  lastFiredAt?: string;
}

export interface CustomDomainConfig {
  domain?: string;
  verified: boolean;
  sslActive: boolean;
  lastCheckedAt?: string;
}

export interface CreatorIntegrationsConfig {
  webhooks: CreatorWebhookEndpoint[];
  tracking: TrackingPixelsConfig;
  liveClass: LiveClassConfig;
  emailMarketing: EmailMarketingConfig;
  telegram: TelegramConfig;
  googleSheets: GoogleSheetsConfig;
  discord: DiscordConfig;
  sms: SmsConfig;
  customDomain: CustomDomainConfig;
}
