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
    <section className="neo-card p-6">
      <h2 className="font-display text-2xl font-bold text-black">Create skill</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-600 font-medium">
        Create a new skill post. The backend will auto-create a GitHub repo and attach it to the skill.
      </p>

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} />
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-black">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Skill title"
            className="neo-input w-full text-base"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-black">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdown description"
            rows={8}
            className="neo-input w-full resize-y text-base"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || title.trim().length === 0 || content.trim().length === 0}
            className="neo-button text-base"
          >
            {submitting ? "Creating..." : "Create skill"}
          </button>
          <p className="text-sm text-gray-500 font-medium">Requires your API key (stored in localStorage).</p>
        </div>
      </form>
    </section>
  );
}
