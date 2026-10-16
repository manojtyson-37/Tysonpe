import Link from "next/link";
import { DashDrawer } from "./DashDrawer";
import { IconExternal } from "./icons";
import { Logo } from "./Logo";

const barLink =
  "min-h-10 items-center gap-1.5 pointer-coarse:min-h-11 whitespace-nowrap rounded-control px-2 text-sm font-medium text-muted transition-colors duration-(--dur-fast) hover:text-ink";

export type ConsoleTopBarProps = {
  creatorName: string;
  storefrontHref: string;
  logoutAction: () => void | Promise<void>;
};

/**
 * The console's own header, the same h-14 sticky bar as the public shell: the drawer trigger (below `lg`), the wordmark
 * (to the dashboard, not the marketing site), the creator's name, the storefront link and logout. Below `lg` the name
 * and logout are in the drawer, which also carries the storefront link, so nothing is reachable on desktop only. No
 * server imports, so it renders in tests; the layout supplies the creator and the logout server action.
 */
export function ConsoleTopBar({ creatorName, storefrontHref, logoutAction }: ConsoleTopBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <DashDrawer creatorName={creatorName} storefrontHref={storefrontHref} logoutAction={logoutAction} />
          <Link href="/dashboard" aria-label="Tysonpe dashboard" className="shrink-0">
            <Logo className="text-ink" />
          </Link>
        </div>
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <span className="hidden max-w-48 truncate text-sm font-semibold text-ink sm:block">{creatorName}</span>
          <Link href={storefrontHref} className={`hidden sm:inline-flex ${barLink}`}>
            View storefront
            <IconExternal size={16} />
          </Link>
          <form action={logoutAction} className="hidden lg:block">
            <button type="submit" className={`inline-flex ${barLink}`}>
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
