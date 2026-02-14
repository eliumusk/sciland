const { UnauthorizedError } = require('../utils/errors');

function extractToken(req) {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith('Bearer ')) {
    return bearer.slice(7).trim();
  }

  return req.headers['x-api-key'] || '';
}

function requireModerator(config) {
  return (req, _res, next) => {
    const token = extractToken(req);
    if (!token || token !== config.auth.moderatorApiKey) {
      return next(new UnauthorizedError('moderator API key is required'));
    }

    req.actor = {
      role: 'moderator',
      id: req.headers['x-actor-id'] || 'moderator',
    };
    return next();
  };
}

module.exports = {
  requireModerator,
};
