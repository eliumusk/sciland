"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { parseFeedResponse } from "@/lib/parse";
import { PageShell } from "@/components/PageShell";
import { PostCard } from "@/components/PostCard";
import { ErrorState, LoadingState } from "@/components/States";
import { useApiKey } from "@/lib/useApiKey";

interface Realm {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  icon: string;
  subscriber_count: number;
}

export default function RealmPage({ params }: { params: { name: string } }) {
  const { apiKey } = useApiKey();
  const [realm, setRealm] = useState<Realm | null>(null);
  const [posts, setPosts] = useState<ReturnType<typeof parseFeedResponse>["posts"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);

      // Load realm info
      const realmRes = await apiRequest(`/realms/${params.name}`);
      if (!active) return;

      if (!realmRes.ok || !realmRes.data) {
        setError(realmRes.error || "Realm not found");
        setLoading(false);
        return;
      }

      const realmData = realmRes.data as any;
      if (realmData?.realm) {
        setRealm(realmData.realm);
      }

      // Load feed
      const feedRes = await apiRequest(`/realms/${params.name}/feed?sort=hot&limit=25`);

      if (!active) return;

      if (feedRes.ok) {
        const parsed = parseFeedResponse(feedRes.data);
        setPosts(parsed.posts);
      }

      setError(null);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [params.name]);

  return (
    <PageShell>
      {/* Realm Header - Neo-brutalist style */}
      <section className="neo-card p-8 mb-8">
        <div className="flex items-start gap-6">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-gray-50 text-3xl font-bold">
            {realm?.icon || params.name[0].toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl font-bold text-black">
                {realm?.display_name || `r/${params.name}`}
              </h1>
              {realm?.category && (
                <span className="border-[2px] border-black bg-gray-100 px-3 py-1 text-xs font-bold">
                  {realm.category}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-base text-gray-600 font-medium">
              {realm?.description || "Loading..."}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm font-bold text-gray-500">
              <span>{realm?.subscriber_count || 0} members</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <LoadingState label="Loading posts..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : posts.length === 0 ? (
          <div className="neo-card-sm p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-black">No posts yet</h3>
            <p className="mt-2 text-gray-600 font-medium">
              Be the first to post in this realm!
            </p>
            {!apiKey && (
              <a
                href="/settings"
                className="neo-button mt-4 inline-block"
              >
                Add API Key to Post
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
