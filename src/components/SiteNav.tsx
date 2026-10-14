import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "./Logo";

export async function SiteNav() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Tysonpe home"><Logo /></Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link href="/library" className="btn btn-ghost btn-sm">My library</Link>
              <Link href={user.creator ? "/dashboard" : "/dashboard/onboarding"} className="btn btn-secondary btn-sm">
                {user.creator ? "Dashboard" : "Start selling"}
              </Link>
              <form action={logout}>
                <button className="btn btn-ghost btn-sm" type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
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
    <footer className="mt-auto border-t border-line py-10 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <Logo className="!text-base" />
        <p>© {new Date().getFullYear()} Tysonpe. Payments run in test mode.</p>
      </div>
    </footer>
  );
}
