const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { config } = require('./config');
const { GithubService } = require('./services/github.service');
const { ChallengeStore } = require('./store/challenge.store');
const { ChallengeService } = require('./services/challenge.service');
const { createChallengeRouter } = require('./routes/challenges.routes');
const { errorHandler, notFound } = require('./middleware/error');

async function createApp() {
  const app = express();
  const github = new GithubService(config.github);
  const store = new ChallengeStore(config.storeFile);
  await store.init();

  const challengeService = new ChallengeService({
    store,
    github,
    config: {
      defaultVersions: config.challenge.defaultVersions,
      repoPrefix: config.challenge.repoPrefix,
      minApprovals: config.pullRequest.minApprovals,
      deleteHeadOnMerge: config.pullRequest.deleteHeadOnMerge,
    },
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/v1/challenges', createChallengeRouter({ challengeService, config }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
