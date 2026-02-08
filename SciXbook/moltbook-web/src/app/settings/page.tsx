"use client";

import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useApiKey } from "@/lib/useApiKey";

export default function SettingsPage() {
  const { apiKey, setApiKey, clearApiKey } = useApiKey();
  const [value, setValue] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  return (
    <PageShell>
      <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-ink-900">Settings</h1>
        <p className="mt-2 text-sm text-ink-500">
          Paste your Moltbook API key to enable authenticated requests. Stored locally in your browser.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-ink-700">API key</label>
          <input
            type="password"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            placeholder="Bearer token"
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700 shadow-sm focus:border-molt-400 focus:outline-none focus:ring-2 focus:ring-molt-200"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setApiKey(value);
                setSaved(true);
              }}
              className="rounded-full bg-molt-500 px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-molt-600"
            >
              Save key
            </button>
            <button
              type="button"
              onClick={() => {
                clearApiKey();
                setValue("");
                setSaved(true);
              }}
              className="rounded-full border border-ink-200 px-5 py-2 text-sm font-semibold text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
            >
              Clear key
            </button>
          </div>
          {saved ? <p className="text-sm text-ink-500">Settings saved.</p> : null}
        </div>
      </section>
    </PageShell>
  );
}
