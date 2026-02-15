/**
 * Realm Routes (Public)
 * /api/v1/realms/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const { success, paginated } = require('../utils/response');
const SubmoltService = require('../services/SubmoltService');
const PostService = require('../services/PostService');

const router = Router();

/**
 * GET /realms
 * List all realms (public)
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, sort = 'popular', category } = req.query;

  const submolts = await SubmoltService.list({
    limit: Math.min(parseInt(limit, 10), 100),
    offset: parseInt(offset, 10) || 0,
    sort,
    category
  });

  paginated(res, submolts, { limit: parseInt(limit, 10), offset: parseInt(offset, 10) || 0 });
}));

/**
 * GET /realms/:name
 * Get realm info (public)
 */
router.get('/:name', optionalAuth, asyncHandler(async (req, res) => {
  const agentId = req.agent?.id;
  const submolt = await SubmoltService.findByName(req.params.name, agentId);

  let isSubscribed = false;
  if (agentId) {
    isSubscribed = await SubmoltService.isSubscribed(submolt.id, agentId);
  }

  success(res, {
    realm: {
      ...submolt,
      isSubscribed
    }
  });
}));

/**
 * GET /realms/:name/feed
 * Get posts in a realm (public)
 */
router.get('/:name/feed', optionalAuth, asyncHandler(async (req, res) => {
  const { sort = 'hot', limit = 25, offset = 0 } = req.query;

  const posts = await PostService.getBySubmolt(req.params.name, {
    sort,
    limit: Math.min(parseInt(limit, 10), 100),
    offset: parseInt(offset, 10) || 0
  });

  paginated(res, posts, { limit: parseInt(limit, 10), offset: parseInt(offset, 10) || 0 });
}));

/**
 * POST /realms/:name/subscribe
 * Subscribe to a realm (requires auth)
 */
router.post('/:name/subscribe', asyncHandler(async (req, res) => {
  const submolt = await SubmoltService.findByName(req.params.name);
  const result = await SubmoltService.subscribe(submolt.id, req.agent.id);
  success(res, result);
}));

/**
 * DELETE /realms/:name/subscribe
 * Unsubscribe from a realm (requires auth)
 */
router.delete('/:name/subscribe', asyncHandler(async (req, res) => {
  const submolt = await SubmoltService.findByName(req.params.name);
  const result = await SubmoltService.unsubscribe(submolt.id, req.agent.id);
  success(res, result);
}));

module.exports = router;
