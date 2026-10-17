import Link from "next/link";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import type { SiteNavItem } from "./site-nav-links";
import { buttonClass } from "./ui/button";

const navLink =
  "min-h-10 items-center pointer-coarse:min-h-11 whitespace-nowrap rounded-control px-2 text-sm font-medium text-muted transition-colors duration-(--dur-fast) hover:text-ink";

type Props = { items: SiteNavItem[]; logoutAction: () => void | Promise<void> };

/**
 * The public header: wordmark, the plain links, one ink action. Below `lg` only the wordmark, the ink action and the
 * hamburger show; every other item is in the MobileMenu sheet, which renders the same `items`. No server imports here, so
 * it renders in tests; `SiteNav` supplies the user and the logout server action.
 */
export function SiteNavView({ items, logoutAction }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md print:hidden">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Tysonpe home">
          <Logo className="text-ink" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          {items.map((item) => {
            if (item.kind === "link") {
              return (
                <Link key={item.key} href={item.href} className={`hidden lg:inline-flex ${navLink}`}>
                  {item.label}
                </Link>
              );
            }
            if (item.kind === "action") {
              return (
                <Link key={item.key} href={item.href} className={buttonClass({ variant: "primary", size: "sm" })}>
                  {item.label}
                </Link>
              );
            }
            return (
              <form key={item.key} action={logoutAction} className="hidden lg:block">
                <button className={`inline-flex ${navLink}`} type="submit">
                  {item.label}
                </button>
              </form>
            );
          })}
          <MobileMenu items={items} logoutAction={logoutAction} />
        </div>
      </nav>
    </header>
  );
}
