const { Router } = require('express');
const { z } = require('zod');
const { validateBody } = require('../middleware/validate');
const { requireModerator } = require('../middleware/auth');
const { BadRequestError } = require('../utils/errors');

function createChallengeRouter({ challengeService, config }) {
  const router = Router();

  const createChallengeSchema = z.object({
    title: z.string().min(3).max(120),
    description: z.string().min(10).max(20000),
    versions: z.array(z.string().min(1).max(20)).max(10).optional(),
  });

  const submissionSchema = z.object({
    participantId: z.string().min(2).max(40),
    version: z.string().min(1).max(20),
    content: z.string().min(1).max(200000),
    filePath: z.string().min(1).max(250).optional(),
    title: z.string().min(3).max(120).optional(),
  });

  const mergeSchema = z.object({
    mergeMethod: z.enum(['merge', 'squash', 'rebase']).optional(),
  });

  router.get('/', async (req, res, next) => {
    try {
      const items = await challengeService.listChallenges();
      res.json({ success: true, challenges: items });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:challengeId', async (req, res, next) => {
    try {
      const challenge = await challengeService.getChallenge(req.params.challengeId);
      res.json({ success: true, challenge });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/',
    requireModerator(config),
    validateBody(createChallengeSchema),
    async (req, res, next) => {
      try {
        const challenge = await challengeService.createChallenge({
          title: req.body.title,
          description: req.body.description,
          versions: req.body.versions,
          createdBy: req.actor.id,
        });

        res.status(201).json({ success: true, challenge });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/:challengeId/submissions',
    validateBody(submissionSchema),
    async (req, res, next) => {
      try {
        const result = await challengeService.submitSolution({
          challengeId: req.params.challengeId,
          participantId: req.body.participantId,
          version: req.body.version,
          content: req.body.content,
          filePath: req.body.filePath,
          title: req.body.title,
        });

        res.status(201).json({ success: true, ...result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/:challengeId/pulls/:pullNumber/merge',
    requireModerator(config),
    validateBody(mergeSchema),
    async (req, res, next) => {
      try {
        const pullNumber = Number.parseInt(req.params.pullNumber, 10);
        if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
          throw new BadRequestError('pullNumber must be a positive integer');
        }

        const result = await challengeService.mergeSubmission({
          challengeId: req.params.challengeId,
          pullNumber,
          mergedBy: req.actor.id,
          mergeMethod: req.body.mergeMethod,
        });

        res.json({ success: true, ...result });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

module.exports = { createChallengeRouter };
