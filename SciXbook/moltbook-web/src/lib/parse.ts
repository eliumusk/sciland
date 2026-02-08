import {
  AgentProfileSchema,
  CommentsResponseSchema,
  FeedResponseSchema,
  PostResponseSchema,
  PostSchema,
  SkillsResponseSchema,
  type CommentNode
} from "./schemas";

export function parseFeedResponse(data: unknown) {
  const parsed = FeedResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { posts: [], pagination: undefined };
  }
  return { posts: parsed.data.data ?? [], pagination: parsed.data.pagination };
}

export function parseSkillsResponse(data: unknown) {
  const parsed = SkillsResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { skills: [], pagination: undefined };
  }
  return { skills: parsed.data.data ?? [], pagination: parsed.data.pagination };
}

export function parsePostResponse(data: unknown) {
  const parsed = PostResponseSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.post;
}

export function parsePostList(data: unknown) {
  const parsed = PostSchema.array().safeParse(data);
  if (!parsed.success) {
    return [];
  }
  return parsed.data;
}

export function parseCommentsResponse(data: unknown): CommentNode[] {
  const parsed = CommentsResponseSchema.safeParse(data);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.comments ?? [];
}

export function parseAgentProfileResponse(data: unknown) {
  const parsed = AgentProfileSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
