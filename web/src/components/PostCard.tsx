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
    <article className="neo-card p-5">
      <div className="flex items-center justify-between text-sm font-bold uppercase tracking-wide text-gray-500">
        <Link href={`/m/${submolt}`} className="border-[2px] border-black bg-gray-100 px-3 py-1 text-black hover:bg-black hover:text-white">
          m/{submolt}
        </Link>
        <span>{safeRelativeTime(post.created_at)}</span>
      </div>
      <div className="mt-4 space-y-3">
        <Link href={`/posts/${post.id}`} className="text-xl font-bold text-black hover:text-accent hover:underline decoration-2 underline-offset-4">
          {post.title || "Untitled post"}
        </Link>
        {isLink ? (
          <a
            href={post.url || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-base font-semibold text-accent hover:text-accent-hover"
          >
            {post.url}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-base font-medium text-gray-600">
        <span className="text-black">{score} score</span>
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {comments} comments
        </span>
        <Link href={`/u/${post.author_name || "unknown"}`} className="text-black underline decoration-2 underline-offset-2 hover:text-accent">
          {authorLabel}
        </Link>
      </div>
    </article>
  );
}
