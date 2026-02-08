/**
 * SkillService
 * Skill posts are stored in posts table but exposed via /api/v1/skills.
 * The submolt concept is hidden from the client.
 */

const { queryOne, queryAll, transaction } = require('../config/database');
const { BadRequestError, NotFoundError, InternalError } = require('../utils/errors');
const config = require('../config');
const { createScilandClient } = require('../clients/sciland');

const SKILLS_SUBMOLT = 'skills';

function parseGitHubRepoFullNameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (u.hostname !== 'github.com') return null;
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`.replace(/\.git$/, '');
  } catch {
    return null;
  }
}

async function ensureSkillsSubmolt(client) {
  // Create if missing.
  await client.query(
    `INSERT INTO submolts (name, display_name, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO NOTHING`,
    [SKILLS_SUBMOLT, 'Skills', 'Skill directory posts']
  );

  const submolt = await client.query(
    'SELECT id, name FROM submolts WHERE name = $1',
    [SKILLS_SUBMOLT]
  );

  return submolt.rows[0] || null;
}

class SkillService {
  static async list({ q = null, sort = 'hot', limit = 25, offset = 0 } = {}) {
    const safeLimit = Math.min(parseInt(limit, 10) || 25, config.pagination.maxLimit);
    const safeOffset = parseInt(offset, 10) || 0;
    const search = q && String(q).trim().length > 0 ? String(q).trim() : null;

    let orderBy;
    switch (sort) {
      case 'new':
        orderBy = 'p.created_at DESC, p.id DESC';
        break;
      case 'hot':
      default:
        // Prefer activity signals when available; fallback to creation time.
        orderBy = 'COALESCE(s.last_activity_at, p.created_at) DESC, COALESCE(s.merged_pr_count, 0) DESC, p.created_at DESC';
        break;
    }

    const params = [SKILLS_SUBMOLT, safeLimit, safeOffset];
    let where = 'WHERE p.submolt = $1 AND p.is_deleted = false';
    let paramIndex = 4;

    if (search) {
      where += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const rows = await queryAll(
      `SELECT p.id, p.title, p.content, p.url, p.created_at,
              s.repo_full_name, s.last_activity_at, s.merged_pr_count, s.open_pr_count, s.updated_at
       FROM posts p
       LEFT JOIN skill_repo_status s ON s.post_id = p.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      params
    );

    return rows.map(SkillService._toApiSkill);
  }

  static async findById(id) {
    const row = await queryOne(
      `SELECT p.id, p.title, p.content, p.url, p.created_at,
              s.repo_full_name, s.last_activity_at, s.merged_pr_count, s.open_pr_count, s.updated_at
       FROM posts p
       LEFT JOIN skill_repo_status s ON s.post_id = p.id
       WHERE p.id = $1 AND p.submolt = $2 AND p.is_deleted = false`,
      [id, SKILLS_SUBMOLT]
    );

    if (!row) throw new NotFoundError('Skill');
    return SkillService._toApiSkill(row);
  }

  static async create({ authorId, title, content }) {
    if (!authorId) throw new InternalError('authorId missing');

    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Title is required');
    }
    if (title.length > 300) {
      throw new BadRequestError('Title must be 300 characters or less');
    }
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('Content is required');
    }
    if (content.length > 40000) {
      throw new BadRequestError('Content must be 40000 characters or less');
    }

    const sciland = createScilandClient({
      baseUrl: config.sciland.baseUrl,
      apiKey: config.sciland.moderatorApiKey
    });

    // Create repo first (external side effect), then commit DB transaction.
    const challenge = await sciland.createChallenge({
      title: title.trim(),
      description: content
    });

    const repoUrl = challenge.repo_url;
    const repoFullName = challenge.repo_full_name || parseGitHubRepoFullNameFromUrl(repoUrl);

    const created = await transaction(async (client) => {
      const submolt = await ensureSkillsSubmolt(client);
      if (!submolt) throw new InternalError('Failed to ensure skills community');

      const postRes = await client.query(
        `INSERT INTO posts (author_id, submolt_id, submolt, title, content, url, post_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, content, url, created_at`,
        [authorId, submolt.id, SKILLS_SUBMOLT, title.trim(), content, repoUrl, 'link']
      );
      const post = postRes.rows[0];

      // Derived metrics row is optional if repo_full_name isn't known yet.
      if (repoFullName) {
        await client.query(
          `INSERT INTO skill_repo_status (post_id, repo_full_name, last_activity_at, merged_pr_count, open_pr_count, updated_at)
           VALUES ($1, $2, NOW(), 0, NULL, NOW())
           ON CONFLICT (post_id) DO UPDATE
           SET repo_full_name = EXCLUDED.repo_full_name,
               updated_at = NOW()`,
          [post.id, repoFullName]
        );
      }

      return {
        ...post,
        repo_full_name: repoFullName,
        last_activity_at: new Date().toISOString(),
        merged_pr_count: 0,
        open_pr_count: null,
        updated_at: new Date().toISOString()
      };
    });

    return SkillService._toApiSkill(created);
  }

  static _toApiSkill(row) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      url: row.url,
      metrics: row.repo_full_name
        ? {
            repo_full_name: row.repo_full_name,
            last_activity_at: row.last_activity_at,
            merged_pr_count: row.merged_pr_count,
            open_pr_count: row.open_pr_count,
            updated_at: row.updated_at
          }
        : null
    };
  }
}

module.exports = SkillService;

