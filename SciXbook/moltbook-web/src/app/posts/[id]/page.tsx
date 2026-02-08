"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { parseCommentsResponse, parsePostResponse } from "@/lib/parse";
import { safeFormatDate, safeRelativeTime } from "@/lib/dates";
import { PageShell } from "@/components/PageShell";
import { CommentTree } from "@/components/CommentTree";
import { ErrorState, LoadingState } from "@/components/States";
import { useApiKey } from "@/lib/useApiKey";

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { apiKey } = useApiKey();
  const [post, setPost] = useState<ReturnType<typeof parsePostResponse> | null>(null);
  const [comments, setComments] = useState<ReturnType<typeof parseCommentsResponse>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const [postRes, commentsRes] = await Promise.all([
        apiRequest(`/posts/${params.id}`),
        apiRequest(`/posts/${params.id}/comments?sort=top&limit=200`)
      ]);

      if (!active) return;

      if (!postRes.ok) {
        setError(postRes.error || "Unable to load post.");
        setPost(null);
        setComments([]);
        setLoading(false);
        return;
      }

      const parsedPost = parsePostResponse(postRes.data);
      if (!parsedPost) {
        setError("Unexpected post data received.");
        setPost(null);
      } else {
        setPost(parsedPost);
      }

      if (commentsRes.ok) {
        setComments(parseCommentsResponse(commentsRes.data));
      } else {
        setComments([]);
      }

      setError(null);
      setLoading(false);
    }

    if (apiKey) {
      load();
    } else {
      setLoading(false);
      setPost(null);
      setComments([]);
      setError(null);
    }

    return () => {
      active = false;
    };
  }, [apiKey, params.id]);

  return (
    <PageShell>
      {!apiKey ? <ErrorState message="Add your API key in Settings to load this post." /> : null}
      {loading ? <LoadingState label="Loading post..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && post ? (
        <section className="space-y-6">
          <article className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <Link href={`/m/${post.submolt || "unknown"}`} className="rounded-full bg-ink-50 px-3 py-1 text-ink-600">
                m/{post.submolt || "unknown"}
              </Link>
              <span>{safeRelativeTime(post.created_at)}</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-ink-900">{post.title || "Untitled post"}</h1>
            <p className="mt-3 text-sm text-ink-500">
              Posted by{" "}
              <Link href={`/u/${post.author_name || "unknown"}`} className="font-semibold text-ink-700">
                {post.author_display_name || post.author_name || "Unknown agent"}
              </Link>{" "}
              on {safeFormatDate(post.created_at)}
            </p>
            {post.content ? (
              <div className="mt-6 whitespace-pre-wrap text-sm text-ink-800">{post.content}</div>
            ) : null}
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-molt-200 bg-molt-50 px-4 py-2 text-sm font-semibold text-molt-800"
              >
                {post.url}
              </a>
            ) : null}
          </article>

          <section className="rounded-3xl border border-ink-100 bg-white/80 p-6 shadow-card">
            <h2 className="text-lg font-semibold text-ink-900">Threaded comments</h2>
            <p className="mt-2 text-sm text-ink-500">
              {comments.length} comments loaded. Replies are threaded by depth.
            </p>
            <div className="mt-6">
              <CommentTree comments={comments} />
            </div>
          </section>
        </section>
      ) : null}
    </PageShell>
  );
}
