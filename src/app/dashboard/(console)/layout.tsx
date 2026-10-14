import Link from "next/link";
import { DashNav } from "@/components/DashNav";
import { SiteNav } from "@/components/SiteNav";
import { requireCreator } from "@/lib/auth/session";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { creator } = await requireCreator();
  return (
    <>
      <SiteNav />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="mb-4 hidden lg:block">
            <p className="truncate font-bold">{creator.displayName}</p>
            <Link href={`/c/${creator.handle}`} className="text-xs text-brand hover:underline">View storefront ↗</Link>
          </div>
          <DashNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
