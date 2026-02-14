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
router.get('/', requireAuth, asyncHandler(async (req, res) => {
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
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const skill = await SkillService.findById(req.params.id);
  success(res, { skill });
}));

/**
 * POST /skills
 * Create skill (auto-creates GitHub repo via sciland)
 */
router.post('/', requireAuth, postLimiter, asyncHandler(async (req, res) => {
  const { title, content } = req.body || {};

  const skill = await SkillService.create({
    authorId: req.agent.id,
    title,
    content
  });

  created(res, { skill });
}));

module.exports = router;
