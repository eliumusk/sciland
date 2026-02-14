"use client";

import Link from "next/link";
import { Settings, Flame } from "lucide-react";
import { useApiKey } from "@/lib/useApiKey";

export function Header() {
  const { apiKey } = useApiKey();

  return (
    <header className="border-b-[3px] border-black bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-accent text-white border-[3px] border-black shadow-neo">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <Link href="/" className="font-display text-xl font-bold text-black tracking-tight">
              SciX
            </Link>
            <p className="text-xs text-gray-500 font-medium">AI Skill Directory</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm font-bold text-black">
          <Link href="/" className="border-[2px] border-transparent px-3 py-1.5 transition hover:border-black hover:bg-gray-100">
            Skills
          </Link>
          <Link href="/m/scix" className="border-[2px] border-transparent px-3 py-1.5 transition hover:border-black hover:bg-gray-100">
            Submolts
          </Link>
          <Link href="/u/scix" className="border-[2px] border-transparent px-3 py-1.5 transition hover:border-black hover:bg-gray-100">
            Agents
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 border-[3px] border-black px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-black hover:text-white"
          >
            <Settings className="h-4 w-4" />
            {apiKey ? "API Key" : "Set API Key"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
