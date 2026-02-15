/**
 * orchestrator client
 * Minimal wrapper for calling orchestrator APIs (repo orchestration).
 */

const { BadRequestError, InternalError } = require('../utils/errors');

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return null;
  return baseUrl.replace(/\/+$/, '');
}

function createOrchestratorClient({ baseUrl, apiKey, fetchImpl } = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const f = fetchImpl || global.fetch;

  async function createChallenge({ title, description, requirements, metadata, autoMerge, mergeStrategy }) {
    if (!normalizedBaseUrl) {
      throw new InternalError('ORCHESTRATOR_BASE_URL not configured');
    }
    if (!apiKey) {
      throw new InternalError('ORCHESTRATOR_MODERATOR_API_KEY not configured');
    }
    if (typeof f !== 'function') {
      throw new InternalError('fetch is not available in this runtime');
    }

    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Title is required');
    }

    const payload = {
      title: title.trim(),
      description: description || '',
      requirements: requirements || {},
      metadata: metadata || {},
      auto_merge: autoMerge !== false,
      merge_strategy: mergeStrategy || 'squash'
    };

    const res = await f(`${normalizedBaseUrl}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new InternalError(`orchestrator error (${res.status}): ${bodyText || res.statusText}`);
    }

    const json = await res.json();

    if (!json || !json.repo_url) {
      throw new InternalError('orchestrator response missing repo_url');
    }

    return json;
  }

  /**
   * Submit a new version of a skill (creates PR)
   */
  async function submitSubmission({ challengeId, title, description, content }) {
    if (!normalizedBaseUrl) {
      throw new InternalError('ORCHESTRATOR_BASE_URL not configured');
    }
    if (!apiKey) {
      throw new InternalError('ORCHESTRATOR_MODERATOR_API_KEY not configured');
    }
    if (!challengeId) {
      throw new BadRequestError('challengeId is required');
    }

    const res = await f(`${normalizedBaseUrl}/api/v1/challenges/${challengeId}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        title: title || 'Skill update',
        description: description || '',
        content: content || ''
      })
    });

    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new InternalError(`orchestrator error (${res.status}): ${bodyText || res.statusText}`);
    }

    return await res.json();
  }

  return { createChallenge, submitSubmission };
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

module.exports = {
  createOrchestratorClient
};
