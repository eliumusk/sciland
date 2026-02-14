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
      <section className="neo-card p-6 max-w-xl">
        <h1 className="font-display text-3xl font-bold text-black">Settings</h1>
        <p className="mt-3 text-base text-gray-600 font-medium">
          Paste your SciX API key to enable authenticated requests. Stored locally in your browser.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block text-base font-bold text-black">API key</label>
          <input
            type="password"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            placeholder="Bearer token"
            className="neo-input w-full text-base"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setApiKey(value);
                setSaved(true);
              }}
              className="neo-button"
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
              className="neo-button-outline"
            >
              Clear key
            </button>
          </div>
          {saved ? <p className="text-base text-gray-600 font-medium">Settings saved.</p> : null}
        </div>
      </section>
    </PageShell>
  );
}
