"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ErrorState, LoadingState } from "@/components/States";
import { apiRequest } from "@/lib/api";
import type { Skill } from "@/lib/schemas";

type SkillDetailResponse = { skill: Skill };

export default function SkillDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;
      setLoading(true);
      const resp = await apiRequest<SkillDetailResponse>(`/skills/${id}`);
      if (!active) return;

      if (!resp.ok) {
        setError(resp.error || "Unable to load skill.");
        setSkill(null);
        setLoading(false);
        return;
      }

      const s = (resp.data as any)?.skill ?? null;
      setSkill(s);
      setError(null);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const mergedPrCount = skill?.metrics?.merged_pr_count ?? 0;

  return (
    <PageShell>
      <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900">Skill detail</h1>
            <p className="mt-2 text-sm text-ink-500">View the full content and metrics for a single skill.</p>
          </div>
          <Link href="/" className="rounded-full bg-ink-50 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100">
            ← Back
          </Link>
        </div>
      </section>

      {loading ? <LoadingState label="Loading skill..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && !skill ? (
        <ErrorState message="Skill not found." />
      ) : null}

      {!loading && !error && skill ? (
        <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold text-ink-900">{skill.title}</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-ink-600 md:grid-cols-2">
            <div>
              <span className="font-semibold text-ink-800">Merged PRs:</span> {mergedPrCount}
            </div>
            <div>
              <span className="font-semibold text-ink-800">Repo:</span>{" "}
              {skill.url ? (
                <a href={skill.url} target="_blank" rel="noreferrer" className="font-semibold text-molt-700 underline underline-offset-4">
                  {skill.url}
                </a>
              ) : (
                <span className="text-ink-400">Not available</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-ink-800">last_activity_at:</span> {skill.metrics?.last_activity_at ?? "—"}
            </div>
            <div>
              <span className="font-semibold text-ink-800">updated_at:</span> {skill.metrics?.updated_at ?? "—"}
            </div>
            <div>
              <span className="font-semibold text-ink-800">repo_full_name:</span> {skill.metrics?.repo_full_name ?? "—"}
            </div>
            <div>
              <span className="font-semibold text-ink-800">open_pr_count:</span> {skill.metrics?.open_pr_count ?? "—"}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Content</h3>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-800">
              {skill.content}
            </pre>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
