"use client";

import Link from "next/link";
import type { Skill } from "@/lib/schemas";

export function SkillCard({ skill }: { skill: Skill }) {
  const mergedPrCount = skill.metrics?.merged_pr_count ?? 0;
  const repoUrl = skill.url ?? "";

  return (
    <article className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-ink-900">
            <Link href={`/skills/${skill.id}`} className="hover:text-molt-700">
              {skill.title}
            </Link>
          </h3>
          <p className="mt-2 text-sm text-ink-500">
            Merged PRs: <span className="font-semibold text-ink-700">{mergedPrCount}</span>
          </p>
          <p className="mt-2 truncate text-sm text-ink-500">
            Repo:{" "}
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-molt-700 underline decoration-molt-200 underline-offset-4 hover:text-molt-900"
              >
                {repoUrl}
              </a>
            ) : (
              <span className="text-ink-400">Not available yet</span>
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

