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

const router = Router();

/**
 * POST /webhooks/orchestrator
 * Protected by X-Orchestrator-Token
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

  const updated = await SkillRepoStatusService.applyScilandWebhook(req.body);

  success(res, {
    updated: Boolean(updated),
    status: updated || null
  });
}));

module.exports = router;

