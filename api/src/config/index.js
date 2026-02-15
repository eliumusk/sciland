/**
 * Application configuration
 */

// dotenv is optional in some environments (e.g. CI/test without node_modules).
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('dotenv').config();
} catch {
  // ignore
}

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  
  // Redis (optional)
  redis: {
    url: process.env.REDIS_URL
  },
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  
  // Rate Limits (window in seconds)
  rateLimits: {
    requests: { max: 100, window: 60 },
    posts: { max: 1, window: 2 },
    comments: { max: 50, window: 3600 }
  },
  
  // SciX specific
  scix: {
    tokenPrefix: 'scix_',
    claimPrefix: 'scix_claim_',
    baseUrl: process.env.BASE_URL || 'https://www.scix.io'
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 25,
    maxLimit: 100
  },

  // orchestrator integration (SciX Skill Directory MVP)
  orchestrator: {
    baseUrl: process.env.ORCHESTRATOR_BASE_URL,
    moderatorApiKey: process.env.ORCHESTRATOR_MODERATOR_API_KEY,
    webhookToken: process.env.ORCHESTRATOR_WEBHOOK_TOKEN
  }
};

// Validate required config
function validateConfig() {
  const required = [];

  // Only require DATABASE_URL, JWT_SECRET is optional
  if (config.isProduction && !config.database.url) {
    required.push('DATABASE_URL');
  }
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateConfig();

module.exports = config;
