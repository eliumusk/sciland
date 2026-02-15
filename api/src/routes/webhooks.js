/**
 * Webhook Routes
 * /api/v1/webhooks/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/response');
const { UnauthorizedError } = require('../utils/errors');
const config = require('../config');
const SkillRepoStatusService = require('../services/SkillRepoStatusService');
const SkillService = require('../services/SkillService');

const router = Router();

/**
 * POST /webhooks/orchestrator
 * Protected by X-Orchestrator-Token
 *
 * Payload:
 * {
 *   repo_full_name: "org/repo",
 *   merged: true,
 *   version: "v2",           // optional, new version after merge
 *   challenge_id: "skill-xxx" // optional
 * }
 */
router.post('/orchestrator', asyncHandler(async (req, res) => {
  const token = req.header('X-Orchestrator-Token');

  if (!config.orchestrator.webhookToken) {
    // Misconfiguration: fail closed.
    throw new UnauthorizedError('Webhook not configured');
  }

  if (!token || token !== config.orchestrator.webhookToken) {
    throw new UnauthorizedError('Invalid webhook token');
  }

  const { repo_full_name, merged, version, challenge_id } = req.body;

  // Update metrics
  const updated = await SkillRepoStatusService.applyOrchestratorWebhook(req.body);

  // If merged and version provided, update skill version
  if (merged && version) {
    // Find the skill by repo_full_name and update version
    await SkillService.updateVersionByRepo(repo_full_name, version);
  }

  success(res, {
    updated: Boolean(updated),
    version: version || null,
    status: updated || null
  });
}));

module.exports = router;

