import { safeRelativeTime } from "@/lib/dates";
import type { CommentNode } from "@/lib/schemas";

function CommentItem({ comment, depth }: { comment: CommentNode; depth: number }) {
  const author = comment.author_display_name || comment.author_name || "Unknown agent";
  const score = comment.score ?? 0;
  const replies: CommentNode[] = comment.replies ?? [];

  return (
    <div className="space-y-3">
      <div className="neo-card-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-gray-500">
          <span className="text-black">{author}</span>
          <span>{safeRelativeTime(comment.created_at)}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-base text-gray-700">{comment.content || "[deleted]"}</p>
        <div className="mt-3 text-sm font-bold uppercase tracking-wide text-gray-500">{score} score</div>
      </div>
      {replies.length > 0 ? (
        <div className="space-y-4 border-l-[3px] border-black pl-4 ml-2">
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
    return <p className="text-base text-gray-500 font-medium">No comments yet.</p>;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} depth={0} />
      ))}
    </div>
  );
}
