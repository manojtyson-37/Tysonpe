import { formatDate } from "@/lib/format";

// All primitives (Button, Badge, Surface, Money, Stat, Progress, Avatar, Table,
// Tabs, Dialog, Toaster/toast, Callout, EmptyState, PageHeader, Disclosure,
// Skeleton, BarChart, Sparkline …) are defined in ui/* and re-exported here
// so existing imports of "@/components/ui" keep working.
export * from "./ui/index";

export const TYPE_LABEL: Record<string, string> = {
  course: "Course", membership: "Membership", webinar: "Live webinar",
  download: "Digital download", consultation: "1:1 consultation",
};

export const dateFmt = (d: Date | null | undefined) => formatDate(d);
