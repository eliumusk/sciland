/**
 * SkillRepoStatusService
 * Stores derived metrics for Skill posts.
 */

const { BadRequestError } = require('../utils/errors');

class SkillRepoStatusService {
  /**
   * Update derived metrics based on orchestrator webhook payload.
   *
   * @param {Object} payload
   * @param {string} payload.repo_full_name
   * @param {boolean} payload.merged
   * @param {Object} deps
   * @param {Function} deps.queryOne
   * @returns {Promise<Object|null>} updated row or null if not found
   */
  static async applyOrchestratorWebhook(payload, deps = {}) {
    // Avoid loading DB dependencies (pg) in unit tests that inject queryOne.
    const q1 = deps.queryOne || require('../config/database').queryOne;

    const repoFullName = payload?.repo_full_name;
    const merged = Boolean(payload?.merged);

    if (!repoFullName || typeof repoFullName !== 'string') {
      throw new BadRequestError('repo_full_name is required');
    }

    const updated = await q1(
      `UPDATE skill_repo_status
       SET last_activity_at = NOW(),
           merged_pr_count = merged_pr_count + $2,
           updated_at = NOW()
       WHERE repo_full_name = $1
       RETURNING post_id, repo_full_name, last_activity_at, merged_pr_count, open_pr_count, updated_at`,
      [repoFullName, merged ? 1 : 0]
    );

    return updated;
  }
}

module.exports = SkillRepoStatusService;
