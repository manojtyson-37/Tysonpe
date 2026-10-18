import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth/session";
import { getCreatorIntegrations } from "@/lib/integrations/service";
import { IntegrationsDashboard } from "@/components/integrations/IntegrationsDashboard";

export const metadata: Metadata = {
  title: "Integrations & APIs",
  description: "Connect external tools, webhooks, tracking pixels, and webinar platforms.",
};

export default async function IntegrationsPage() {
  const { creator } = await requireCreator();
  const config = await getCreatorIntegrations(creator.id);

  return (
    <IntegrationsDashboard
      initialConfig={config}
      creatorHandle={creator.handle}
    />
  );
}
