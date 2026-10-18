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
  provider: "none" | "mailchimp" | "convertkit" | "activecampaign";
  apiKey?: string;
  audienceId?: string;
  tag?: string;
  autoSyncLearners: boolean;
}

export interface TelegramConfig {
  channelUrl?: string;
  groupName?: string;
  autoInviteOnPurchase: boolean;
}

export interface CreatorIntegrationsConfig {
  webhooks: CreatorWebhookEndpoint[];
  tracking: TrackingPixelsConfig;
  liveClass: LiveClassConfig;
  emailMarketing: EmailMarketingConfig;
  telegram: TelegramConfig;
}
