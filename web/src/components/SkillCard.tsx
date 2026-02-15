"use client";

import Link from "next/link";
import type { Skill } from "@/lib/schemas";

export function SkillCard({ skill }: { skill: Skill }) {
  const mergedPrCount = skill.metrics?.merged_pr_count ?? 0;
  const repoUrl = skill.url ?? "";

  return (
    <article className="neo-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-neo-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold text-black">
            <Link href={`/skills/${skill.id}`} className="hover:text-accent hover:underline decoration-2 underline-offset-4">
              {skill.title}
            </Link>
          </h3>
          <p className="mt-3 text-sm font-medium text-gray-600">
            Merged PRs: <span className="text-black font-bold">{mergedPrCount}</span>
          </p>
          <p className="mt-2 truncate text-sm text-gray-500">
            Repo:{" "}
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline decoration-2 underline-offset-2 hover:text-accent-hover"
              >
                {repoUrl}
              </a>
            ) : (
              <span className="text-gray-400 font-medium">Not available yet</span>
            )}
          </p>
        </div>
      </div>
    </article>
  );
}
