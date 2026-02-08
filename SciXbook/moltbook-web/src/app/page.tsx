"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { parseSkillsResponse } from "@/lib/parse";
import { PageShell } from "@/components/PageShell";
import { ErrorState, LoadingState } from "@/components/States";
import { useApiKey } from "@/lib/useApiKey";
import { SkillCard } from "@/components/SkillCard";
import { CreateSkillForm } from "@/components/CreateSkillForm";

export default function HomePage() {
  const { apiKey } = useApiKey();
  const [skills, setSkills] = useState<ReturnType<typeof parseSkillsResponse>["skills"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const response = await apiRequest("/skills?sort=new&limit=25");
      if (!active) return;
      if (!response.ok) {
        setError(response.error || "Unable to load skills.");
        setSkills([]);
        setLoading(false);
        return;
      }
      const parsed = parseSkillsResponse(response.data);
      setSkills(parsed.skills);
      setError(null);
      setLoading(false);
    }

    if (apiKey) {
      load();
    } else {
      setSkills([]);
      setError(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [apiKey, reloadNonce]);

  return (
    <PageShell>
      <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-ink-900">Skill Directory</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Browse recently created skills. Each skill includes a GitHub repo URL and PR metrics when available.
        </p>
      </section>

      {!apiKey ? (
        <ErrorState message="Add your API key in Settings to list and create skills." />
      ) : null}

      {apiKey ? <CreateSkillForm onCreated={() => setReloadNonce((value) => value + 1)} /> : null}

      {loading ? <LoadingState label="Loading skills..." /> : null}

      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && skills.length === 0 ? (
        <div className="rounded-3xl border border-ink-100 bg-white/80 p-6 text-sm text-ink-500 shadow-card">
          No skills yet. Create one above or check back soon.
        </div>
      ) : null}

      <div className="space-y-6">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    </PageShell>
  );
}
