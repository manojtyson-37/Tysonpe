import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_HANDLE } from "@/lib/demo";
import { Logo } from "./Logo";

const navLink =
  "min-h-10 items-center whitespace-nowrap rounded px-2 text-[13px] font-medium text-muted transition-colors duration-150 hover:text-ink";

export async function SiteNav() {
  const user = await getCurrentUser();
  const storefrontHandle = user?.creator?.handle ?? DEMO_HANDLE;
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Tysonpe home"><Logo className="text-ink" /></Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href="/#sandbox-demo" className={`hidden sm:inline-flex ${navLink}`}>Checkout demo</Link>
          <Link href="/#pricing" className={`hidden sm:inline-flex ${navLink}`}>Fees</Link>
          {storefrontHandle && (
            <Link href={`/c/${storefrontHandle}`} className={`hidden md:inline-flex ${navLink}`}>Sample storefront</Link>
          )}
          {user ? (
            <>
              <Link href="/library" className={`inline-flex ${navLink}`}>My library</Link>
              <Link
                href={user.creator ? "/dashboard" : "/dashboard/onboarding"}
                className="btn btn-primary btn-sm"
              >
                {user.creator ? "Dashboard" : "Start selling"}
              </Link>
              <form action={logout}>
                <button className={`inline-flex ${navLink}`} type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={`inline-flex ${navLink}`}>Log in</Link>
              <Link href="/signup?role=creator" className="btn btn-primary btn-sm">Start selling</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-2/60 py-8 text-[13px] text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <Logo className="!text-base text-ink" />
        <p>© {new Date().getFullYear()} Tysonpe. Payments run in test mode; no real money moves.</p>
      </div>
    </footer>
  );
}
