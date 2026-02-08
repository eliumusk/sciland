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
 * POST /webhooks/sciland
 * Protected by X-Sciland-Token
 */
router.post('/sciland', asyncHandler(async (req, res) => {
  const token = req.header('X-Sciland-Token');

  if (!config.sciland.webhookToken) {
    // Misconfiguration: fail closed.
    throw new UnauthorizedError('Webhook not configured');
  }

  if (!token || token !== config.sciland.webhookToken) {
    throw new UnauthorizedError('Invalid webhook token');
  }

  const updated = await SkillRepoStatusService.applyScilandWebhook(req.body);

  success(res, {
    updated: Boolean(updated),
    status: updated || null
  });
}));

module.exports = router;

