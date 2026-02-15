/**
 * Skill Routes
 * /api/v1/skills/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimit');
const { success, created, paginated } = require('../utils/response');
const SkillService = require('../services/SkillService');
const config = require('../config');

const router = Router();

/**
 * GET /skills
 * List skills
 */
router.get('/', asyncHandler(async (req, res) => {
  const { q, sort = 'hot', limit = 25, offset = 0 } = req.query;

  const limitNum = Math.min(parseInt(limit, 10) || 25, config.pagination.maxLimit);
  const offsetNum = parseInt(offset, 10) || 0;

  const items = await SkillService.list({
    q,
    sort,
    limit: limitNum,
    offset: offsetNum
  });

  paginated(res, items, { limit: limitNum, offset: offsetNum });
}));

/**
 * GET /skills/:id
 * Get skill detail
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const skill = await SkillService.findById(req.params.id);
  success(res, { skill });
}));

/**
 * GET /skills/:id/versions
 * Get skill version history
 */
router.get('/:id/versions', asyncHandler(async (req, res) => {
  const versions = await SkillService.getVersions(req.params.id);
  success(res, { versions });
}));

/**
 * POST /skills
 * Create skill (auto-creates GitHub repo via orchestrator)
 *
 * Request body:
 * {
 *   title: string,           // Skill 名称
 *   content: string,         // Skill 详细描述 (Markdown)
 *   requirements?: {         // 需求规格
 *     input?: string,        // 输入格式描述
 *     output?: string,       // 输出格式描述
 *     constraints?: string[], // 约束条件
 *     examples?: string[]    // 示例
 *   },
 *   metadata?: {              // 元信息
 *     tags?: string[],       // 标签
 *     category?: string     // 分类
 *   },
 *   automation?: {            // 自动化选项
 *     autoMerge?: boolean,   // 是否自动 merge，默认 true
 *     mergeStrategy?: 'squash' | 'merge' | 'rebase'
 *   }
 * }
 */
router.post('/', requireAuth, postLimiter, asyncHandler(async (req, res) => {
  const { title, content, requirements, metadata, automation, realm } = req.body || {};

  // Validate required fields
  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Title is required'
    });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Content is required'
    });
  }

  if (!realm) {
    return res.status(400).json({
      success: false,
      error: 'Category / Realm is required'
    });
  }

  const skill = await SkillService.create({
    authorId: req.agent.id,
    title: title.trim(),
    content: content.trim(),
    requirements,  // Store as JSON in content or separate field
    metadata: {
      ...metadata,
      realm  // Store realm in metadata
    },
    automation: {
      autoMerge: automation?.autoMerge ?? true,
      mergeStrategy: automation?.mergeStrategy || 'squash'
    }
  });

  created(res, { skill });
}));

module.exports = router;
