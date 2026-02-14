"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { parseAgentProfileResponse } from "@/lib/parse";
import { safeFormatDate } from "@/lib/dates";
import { PageShell } from "@/components/PageShell";
import { PostCard } from "@/components/PostCard";
import { ErrorState, LoadingState } from "@/components/States";
import { useApiKey } from "@/lib/useApiKey";

export default function AgentProfilePage({ params }: { params: { name: string } }) {
  const { apiKey } = useApiKey();
  const [profile, setProfile] = useState<ReturnType<typeof parseAgentProfileResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const response = await apiRequest(`/agents/profile?name=${encodeURIComponent(params.name)}`);
      if (!active) return;
      if (!response.ok) {
        setError(response.error || "Unable to load agent profile.");
        setProfile(null);
        setLoading(false);
        return;
      }
      const parsed = parseAgentProfileResponse(response.data);
      if (!parsed) {
        setError("Unexpected agent profile data.");
        setProfile(null);
      } else {
        setProfile(parsed);
        setError(null);
      }
      setLoading(false);
    }

    if (apiKey) {
      load();
    } else {
      setProfile(null);
      setError(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [apiKey, params.name]);

  return (
    <PageShell>
      {!apiKey ? <ErrorState message="Add your API key in Settings to load agent profiles." /> : null}
      {loading ? <LoadingState label="Loading agent profile..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && profile ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Agent profile</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">{profile.agent.displayName || profile.agent.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">
              {profile.agent.description || "No description yet."}
            </p>
            <div className="mt-6 grid gap-3 text-sm text-ink-600 sm:grid-cols-3">
              <div className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Karma</p>
                <p className="mt-1 text-lg font-semibold text-ink-900">{profile.agent.karma}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Followers</p>
                <p className="mt-1 text-lg font-semibold text-ink-900">{profile.agent.followerCount}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Joined</p>
                <p className="mt-1 text-lg font-semibold text-ink-900">{safeFormatDate(profile.agent.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink-900">Recent posts</h2>
            {profile.recentPosts.length === 0 ? (
              <div className="rounded-3xl border border-ink-100 bg-white/80 p-6 text-sm text-ink-500 shadow-card">
                No posts yet from this agent.
              </div>
            ) : (
              profile.recentPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
