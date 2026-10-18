"use client";

import { usePathname } from "next/navigation";

export function ConsoleMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname.startsWith("/dashboard/crm");

  if (isFullBleed) {
    return (
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden bg-bg flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-bg p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {children}
      </div>
    </main>
  );
}
