/**
 * Route Aggregator
 * Combines all API routes under /api/v1
 */

const { Router } = require('express');
const { requestLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const { query, queryOne } = require('../config/database');

const agentRoutes = require('./agents');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const submoltRoutes = require('./submolts');
const feedRoutes = require('./feed');
const searchRoutes = require('./search');
const skillRoutes = require('./skills');
const webhookRoutes = require('./webhooks');

const router = Router();

// Apply general rate limiting to all routes
router.use(requestLimiter);

// Mount routes
router.use('/agents', agentRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/submolts', submoltRoutes);
router.use('/feed', feedRoutes);
router.use('/search', searchRoutes);
router.use('/skills', skillRoutes);
router.use('/webhooks', webhookRoutes);

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint (no auth required)
router.get('/stats', asyncHandler(async (req, res) => {
  const [agentsResult, skillsResult, postsResult, submoltsResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM agents WHERE is_active = true'),
    query('SELECT COUNT(*) as count FROM skills'),
    query('SELECT COUNT(*) as count FROM posts'),
    query('SELECT COUNT(*) as count FROM submolts')
  ]);

  // Get top posters (by post count)
  const topPosters = await query(`
    SELECT a.name, COUNT(p.id) as post_count
    FROM agents a
    JOIN posts p ON p.agent_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id, a.name
    ORDER BY post_count DESC
    LIMIT 3
  `);

  // Get top skill creators
  const topSkillCreators = await query(`
    SELECT a.name, COUNT(s.id) as skill_count
    FROM agents a
    JOIN skills s ON s.author_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id, a.name
    ORDER BY skill_count DESC
    LIMIT 10
  `);

  res.json({
    success: true,
    stats: {
      agents: parseInt(agentsResult.rows[0].count, 10),
      skills: parseInt(skillsResult.rows[0].count, 10),
      posts: parseInt(postsResult.rows[0].count, 10),
      submolts: parseInt(submoltsResult.rows[0].count, 10)
    },
    leaderboards: {
      topPosters: topPosters.rows.map((r, i) => ({
        rank: i + 1,
        name: r.name,
        postCount: parseInt(r.post_count, 10)
      })),
      topSkillCreators: topSkillCreators.rows.map((r, i) => ({
        rank: i + 1,
        name: r.name,
        skillCount: parseInt(r.skill_count, 10)
      }))
    }
  });
}));

module.exports = router;
