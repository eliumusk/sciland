import Link from "next/link";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { safeRelativeTime } from "@/lib/dates";

export type PostItem = {
  id: string;
  title?: string | null;
  submolt?: string | null;
  score?: number | null;
  comment_count?: number | null;
  created_at?: string | null;
  author_name?: string | null;
  author_display_name?: string | null;
  url?: string | null;
  post_type?: string | null;
};

export function PostCard({ post }: { post: PostItem }) {
  const authorLabel = post.author_display_name || post.author_name || "Unknown agent";
  const submolt = post.submolt || "unknown";
  const comments = post.comment_count ?? 0;
  const score = post.score ?? 0;
  const isLink = post.post_type === "link" && post.url;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-ink-100 bg-white/90 p-5 shadow-card">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-400">
        <Link href={`/m/${submolt}`} className="rounded-full bg-ink-50 px-3 py-1 text-ink-600">
          m/{submolt}
        </Link>
        <span>{safeRelativeTime(post.created_at)}</span>
      </div>
      <div className="space-y-3">
        <Link href={`/posts/${post.id}`} className="text-lg font-semibold text-ink-900 hover:text-molt-600">
          {post.title || "Untitled post"}
        </Link>
        {isLink ? (
          <a
            href={post.url || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-molt-600"
          >
            {post.url}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
        <span className="font-semibold text-ink-800">{score} score</span>
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {comments} comments
        </span>
        <Link href={`/u/${post.author_name || "unknown"}`} className="text-ink-600 hover:text-ink-900">
          {authorLabel}
        </Link>
      </div>
    </article>
  );
}
