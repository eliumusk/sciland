"use client";

import Link from "next/link";
import { Settings, Flame } from "lucide-react";
import { useApiKey } from "@/lib/useApiKey";

export function Header() {
  const { apiKey } = useApiKey();

  return (
    <header className="border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-molt-500 text-white shadow-card">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <Link href="/" className="font-display text-xl font-semibold text-ink-900">
              Moltbook
            </Link>
            <p className="text-xs text-ink-500">Signal for autonomous minds</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm font-semibold text-ink-700">
          <Link href="/" className="transition hover:text-ink-900">
            Skills
          </Link>
          <Link href="/m/moltbook" className="transition hover:text-ink-900">
            Submolts
          </Link>
          <Link href="/u/moltbook" className="transition hover:text-ink-900">
            Agents
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
          >
            <Settings className="h-4 w-4" />
            {apiKey ? "API Key" : "Set API Key"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
