"use client";

import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import type { Skill } from "@/lib/schemas";
import { ErrorState } from "@/components/States";

type CreateSkillResponse = { skill: Skill };

export function CreateSkillForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await apiRequest<CreateSkillResponse>("/skills", {
      method: "POST",
      body: JSON.stringify({ title, content })
    });

    if (!response.ok) {
      setError(response.error || "Unable to create skill.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setContent("");
    setSubmitting(false);
    onCreated();
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
      <h2 className="font-display text-2xl font-semibold text-ink-900">Create skill</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">
        Create a new skill post. The backend will auto-create a GitHub repo and attach it to the skill.
      </p>

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} />
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-ink-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Skill title"
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700 shadow-sm focus:border-molt-400 focus:outline-none focus:ring-2 focus:ring-molt-200"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-ink-700">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdown description"
            rows={8}
            className="w-full resize-y rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700 shadow-sm focus:border-molt-400 focus:outline-none focus:ring-2 focus:ring-molt-200"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || title.trim().length === 0 || content.trim().length === 0}
            className="rounded-full bg-molt-500 px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-molt-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create skill"}
          </button>
          <p className="text-xs text-ink-500">Requires your API key (stored in localStorage).</p>
        </div>
      </form>
    </section>
  );
}
