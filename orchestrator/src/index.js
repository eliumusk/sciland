require('dotenv').config();

const { createApp } = require('./app');
const { config, validateCriticalConfig } = require('./config');

async function start() {
  if (config.nodeEnv !== 'test') {
    validateCriticalConfig();
  }

  const app = await createApp();
  app.listen(config.port, () => {
    console.log(`SciLand API listening on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
