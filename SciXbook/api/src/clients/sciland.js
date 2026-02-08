/**
 * sciland client
 * Minimal wrapper for calling sciland APIs (repo orchestration).
 */

const { BadRequestError, InternalError } = require('../utils/errors');

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return null;
  return baseUrl.replace(/\/+$/, '');
}

function createScilandClient({ baseUrl, apiKey, fetchImpl } = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const f = fetchImpl || global.fetch;

  async function createChallenge({ title, description }) {
    if (!normalizedBaseUrl) {
      throw new InternalError('SCILAND_BASE_URL not configured');
    }
    if (!apiKey) {
      throw new InternalError('SCILAND_MODERATOR_API_KEY not configured');
    }
    if (typeof f !== 'function') {
      throw new InternalError('fetch is not available in this runtime');
    }

    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Title is required');
    }

    const res = await f(`${normalizedBaseUrl}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description || ''
      })
    });

    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new InternalError(`sciland error (${res.status}): ${bodyText || res.statusText}`);
    }

    const json = await res.json();

    if (!json || !json.repo_url) {
      throw new InternalError('sciland response missing repo_url');
    }

    return json;
  }

  return { createChallenge };
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

module.exports = {
  createScilandClient
};

