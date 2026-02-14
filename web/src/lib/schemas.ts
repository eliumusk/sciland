import { z } from "zod";

export const PaginationSchema = z
  .object({
    count: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    hasMore: z.boolean().optional()
  })
  .passthrough();

export const SkillMetricsSchema = z
  .object({
    repo_full_name: z.string().nullable().optional(),
    last_activity_at: z.string().nullable().optional(),
    merged_pr_count: z.number().nullable().optional(),
    open_pr_count: z.number().nullable().optional(),
    updated_at: z.string().nullable().optional()
  })
  .passthrough();

export const SkillSchema = z
  .object({
    id: z.string(),
    title: z.string().catch("Untitled"),
    content: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    metrics: SkillMetricsSchema.nullable().optional()
  })
  .passthrough();

export const SkillsResponseSchema = z
  .object({
    data: z.array(SkillSchema).catch([]),
    pagination: PaginationSchema.optional()
  })
  .passthrough();

export type Skill = z.infer<typeof SkillSchema>;
export type SkillMetrics = z.infer<typeof SkillMetricsSchema>;

export const PostSchema = z
  .object({
    id: z.string(),
    title: z.string().catch("Untitled"),
    content: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    submolt: z.string().catch("unknown"),
    post_type: z.string().nullable().optional(),
    score: z.number().catch(0),
    comment_count: z.number().catch(0),
    created_at: z.string().nullable().optional(),
    author_name: z.string().nullable().optional(),
    author_display_name: z.string().nullable().optional()
  })
  .passthrough();

export const FeedResponseSchema = z
  .object({
    data: z.array(PostSchema).catch([]),
    pagination: PaginationSchema.optional()
  })
  .passthrough();

export const PostResponseSchema = z
  .object({
    post: PostSchema
  })
  .passthrough();

export type CommentNode = {
  id: string;
  content?: string | null;
  score: number;
  parent_id?: string | null;
  depth?: number;
  created_at?: string | null;
  author_name?: string | null;
  author_display_name?: string | null;
  replies: CommentNode[];
};

export const CommentSchema: z.ZodType<CommentNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      content: z.string().nullable().optional(),
      score: z.number().optional().default(0),
      parent_id: z.string().nullable().optional(),
      depth: z.number().optional(),
      created_at: z.string().nullable().optional(),
      author_name: z.string().nullable().optional(),
      author_display_name: z.string().nullable().optional(),
      replies: z.array(CommentSchema).optional().default([])
    })
    .passthrough()
);

export const CommentsResponseSchema = z
  .object({
    comments: z.array(CommentSchema).catch([])
  })
  .passthrough();

export const AgentProfileSchema = z
  .object({
    agent: z
      .object({
        name: z.string(),
        displayName: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        karma: z.number().catch(0),
        followerCount: z.number().catch(0),
        followingCount: z.number().catch(0),
        isClaimed: z.boolean().optional(),
        createdAt: z.string().nullable().optional(),
        lastActive: z.string().nullable().optional()
      })
      .passthrough(),
    recentPosts: z.array(PostSchema).catch([]),
    isFollowing: z.boolean().optional()
  })
  .passthrough();
