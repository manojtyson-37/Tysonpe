import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CrmDashboard } from "@/components/crm/CrmDashboard";
import {
  listWhatsAppTemplates,
  getWhatsAppAccountStatus,
} from "@/lib/whatsapp/client";

export default async function CrmPage() {
  const { creator } = await requireCreator();

  // Load leads with messages
  let leads = await db.lead.findMany({
    where: { creatorId: creator.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Seed realistic starter leads if the creator has none yet
  if (leads.length === 0) {
    const starterLead1 = await db.lead.create({
      data: {
        creatorId: creator.id,
        phone: "919876543210",
        name: "Rahul Sharma",
        status: "INQUIRY",
        intent: "Inquired about 1:1 mentorship program & curriculum",
        quoteAmount: 4999,
        botPaused: false,
        messages: {
          create: [
            {
              creatorId: creator.id,
              direction: "INBOUND",
              sender: "CUSTOMER",
              body: "Hi Asha! Does the 30-Day Masterclass cover advanced GST filing for freelancers?",
            },
            {
              creatorId: creator.id,
              direction: "OUTBOUND",
              sender: "BOT",
              body: "Hi Rahul! Yes, Module 4 covers complete GST registration, invoice formats, and quarterly filing with real examples.",
            },
          ],
        },
      },
      include: { messages: true },
    });

    const starterLead2 = await db.lead.create({
      data: {
        creatorId: creator.id,
        phone: "919812345678",
        name: "Pooja Verma",
        status: "NEW",
        intent: "Abandoned UPI checkout on Storefront",
        quoteAmount: 1999,
        botPaused: false,
        messages: {
          create: [
            {
              creatorId: creator.id,
              direction: "OUTBOUND",
              sender: "BOT",
              body: "Hi Pooja! Noticed you were checking out 'Creator Playbook'. Did your UPI payment get interrupted? Use code SAVE10 for 10% off: https://tysonpe.com/c/asha-rao/creator-playbook",
            },
          ],
        },
      },
      include: { messages: true },
    });

    leads = [starterLead1, starterLead2];
  }

  // Fetch live Meta templates & account health
  const [templateRes, accountStatus] = await Promise.all([
    listWhatsAppTemplates(),
    getWhatsAppAccountStatus(),
  ]);

  return (
    <CrmDashboard
      initialLeads={leads}
      initialTemplates={templateRes.templates}
      accountStatus={accountStatus}
      creatorHandle={creator.handle}
    />
  );
}
