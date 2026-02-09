const path = require('node:path');

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseIntOr(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseVersions(value) {
  if (!value) return ['v1'];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
}

const config = {
  port: parseIntOr(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  github: {
    token: process.env.GITHUB_TOKEN || '',
    org: process.env.GITHUB_ORG || 'SciX-Skill',
    apiBaseUrl: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
  },
  auth: {
    moderatorApiKey: process.env.MODERATOR_API_KEY || '',
  },
  challenge: {
    defaultVersions: parseVersions(process.env.DEFAULT_VERSIONS),
    repoPrefix: process.env.CHALLENGE_REPO_PREFIX || 'challenge',
  },
  pullRequest: {
    minApprovals: parseIntOr(process.env.MIN_PR_APPROVALS, 0),
    deleteHeadOnMerge: parseBoolean(process.env.DELETE_HEAD_ON_MERGE, true),
  },
  storeFile: process.env.CHALLENGE_STORE_FILE || path.join(process.cwd(), 'data', 'challenges.json'),
};

function validateCriticalConfig() {
  const missing = [];

  if (!config.github.token) missing.push('GITHUB_TOKEN');
  if (!config.auth.moderatorApiKey) missing.push('MODERATOR_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = {
  config,
  validateCriticalConfig,
};
