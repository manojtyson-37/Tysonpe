import { logout } from "@/app/actions/auth";
import { ConsoleTopBar } from "@/components/ConsoleTopBar";
import { DashNav } from "@/components/DashNav";
import { SkipLink } from "@/components/SkipLink";
import { storefrontHref } from "@/components/dash-nav-links";
import { requireCreator } from "@/lib/auth/session";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { creator } = await requireCreator();
  return (
    <>
      <SkipLink />
      <ConsoleTopBar creatorName={creator.displayName} storefrontHref={storefrontHref(creator.handle)} logoutAction={logout} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 py-8 sm:px-6">
        {/* The sidebar is lg and up; below it the same links are in the top bar's drawer. */}
        <aside className="hidden lg:block lg:w-52 lg:shrink-0">
          <div className="sticky top-22">
            <DashNav />
          </div>
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </>
  );
}
