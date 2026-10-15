import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "./Logo";

export async function SiteNav() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090d]/90 backdrop-blur-md transition-all">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Tysonpe home"><Logo className="text-white" /></Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#sandbox-demo"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span>Gateway Sandbox</span>
          </Link>
          <Link
            href="/#pricing"
            className="hidden sm:inline-block text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/c/asha-rao"
            className="hidden md:inline-block text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            Storefront
          </Link>
          {user ? (
            <>
              <Link href="/library" className="text-xs font-medium text-white/85 hover:text-white">My library</Link>
              <Link
                href={user.creator ? "/dashboard" : "/dashboard/onboarding"}
                className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black shadow-xs hover:bg-white/90 active:scale-[0.97] transition-all"
              >
                {user.creator ? "Dashboard" : "Start selling"}
              </Link>
              <form action={logout}>
                <button className="text-xs font-medium text-white/60 hover:text-white" type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-xs font-medium text-white/85 hover:text-white px-2 py-1">Log in</Link>
              <Link
                href="/signup?role=creator"
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black shadow-md hover:bg-white/90 active:scale-[0.97] transition-all"
              >
                Start selling
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#06070a] py-10 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <Logo className="!text-base text-white" />
        <p>© {new Date().getFullYear()} Tysonpe. Payments run in test mode.</p>
      </div>
    </footer>
  );
}
