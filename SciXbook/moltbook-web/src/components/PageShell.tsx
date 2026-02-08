import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-hero-gradient">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        {children}
      </div>
    </main>
  );
}
