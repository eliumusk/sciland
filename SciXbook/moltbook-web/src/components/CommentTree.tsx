import { safeRelativeTime } from "@/lib/dates";
import type { CommentNode } from "@/lib/schemas";

function CommentItem({ comment, depth }: { comment: CommentNode; depth: number }) {
  const author = comment.author_display_name || comment.author_name || "Unknown agent";
  const score = comment.score ?? 0;
  const replies: CommentNode[] = comment.replies ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-ink-100 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
          <span className="font-semibold text-ink-600">{author}</span>
          <span>{safeRelativeTime(comment.created_at)}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink-800">{comment.content || "[deleted]"}</p>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">{score} score</div>
      </div>
      {replies.length > 0 ? (
        <div className="space-y-4 border-l border-ink-100 pl-4">
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommentTree({ comments }: { comments: CommentNode[] }) {
  if (!comments.length) {
    return <p className="text-sm text-ink-500">No comments yet.</p>;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} depth={0} />
      ))}
    </div>
  );
}
