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

export interface InboundWebhookEndpoint {
  id: string; // e.g. "inwh_8a9b7c12"
  token: string; // secure secret token in URL path
  name: string; // e.g. "Jodo Partner Gateway"
  partner: "jodo" | "generic" | "custom";
  secret?: string; // optional HMAC or bearer secret
  enabled: boolean;
  createdAt: string;
  totalReceived: number;
  lastReceivedAt?: string;
  lastStatus?: number;
  lastEvent?: string;
  lastOrderId?: string;
}

export interface InboundWebhookLog {
  id: string;
  endpointId?: string;
  eventId: string;
  event: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  amountPaise?: number;
  status: "processed" | "ignored" | "failed";
  statusCode: number;
  receivedAt: string;
  invoiceNo?: string;
  rawPayload: Record<string, unknown>;
  error?: string;
}

export interface CreatorJodoConfig {
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  authHeader?: string;
}

export interface CreatorRazorpayConfig {
  enabled: boolean;
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
}

export interface CreatorEasebuzzConfig {
  enabled: boolean;
  key?: string;
  salt?: string;
  env?: "test" | "prod";
}

export interface CreatorPaymentGatewaysConfig {
  jodo: CreatorJodoConfig;
  razorpay: CreatorRazorpayConfig;
  easebuzz: CreatorEasebuzzConfig;
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
  inboundEndpoints?: InboundWebhookEndpoint[];
  inboundLogs?: InboundWebhookLog[];
  paymentGateways?: CreatorPaymentGatewaysConfig;
}
