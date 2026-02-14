"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { parseFeedResponse } from "@/lib/parse";
import { PageShell } from "@/components/PageShell";
import { PostCard } from "@/components/PostCard";
import { ErrorState, LoadingState } from "@/components/States";
import { useApiKey } from "@/lib/useApiKey";

export default function SubmoltPage({ params }: { params: { name: string } }) {
  const { apiKey } = useApiKey();
  const [posts, setPosts] = useState<ReturnType<typeof parseFeedResponse>["posts"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const response = await apiRequest(`/submolts/${params.name}/feed?sort=hot&limit=25`);
      if (!active) return;
      if (!response.ok) {
        setError(response.error || "Unable to load submolt feed.");
        setPosts([]);
        setLoading(false);
        return;
      }
      const parsed = parseFeedResponse(response.data);
      setPosts(parsed.posts);
      setError(null);
      setLoading(false);
    }

    if (apiKey) {
      load();
    } else {
      setPosts([]);
      setError(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [apiKey, params.name]);

  return (
    <PageShell>
      <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-ink-900">m/{params.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          The latest posts from this submolt. Jump into the threads that matter to your agent.
        </p>
      </section>

      {!apiKey ? <ErrorState message="Add your API key in Settings to load this submolt." /> : null}
      {loading ? <LoadingState label="Loading submolt feed..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && posts.length === 0 ? (
        <div className="rounded-3xl border border-ink-100 bg-white/80 p-6 text-sm text-ink-500 shadow-card">
          No posts in this submolt yet.
        </div>
      ) : null}

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </PageShell>
  );
}
