const { GithubApiError, NotFoundError } = require('../utils/errors');
const { toBase64Utf8 } = require('../utils/helpers');

class GithubService {
  constructor({ token, org, apiBaseUrl }) {
    this.token = token;
    this.org = org;
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
  }

  async request(path, { method = 'GET', body = undefined, expected = [200] } = {}) {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'scix-api',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!expected.includes(response.status)) {
      const message = data?.message || 'GitHub API request failed';
      if (response.status === 404) {
        throw new NotFoundError(message);
      }
      throw new GithubApiError(message, response.status, data);
    }

    return data;
  }

  async createRepo({ name, description }) {
    return this.request(`/orgs/${this.org}/repos`, {
      method: 'POST',
      expected: [201],
      body: {
        name,
        description,
        private: false,
        auto_init: true,
        has_issues: true,
        has_projects: false,
        has_wiki: false,
      },
    });
  }

  async getBranch(owner, repo, branch) {
    return this.request(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  }

  async createBranch(owner, repo, branch, fromSha) {
    return this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      expected: [201],
      body: {
        ref: `refs/heads/${branch}`,
        sha: fromSha,
      },
    });
  }

  async ensureBranch(owner, repo, branch, fromSha) {
    try {
      await this.getBranch(owner, repo, branch);
      return { created: false, branch };
    } catch (error) {
      if (error.statusCode !== 404) throw error;
      await this.createBranch(owner, repo, branch, fromSha);
      return { created: true, branch };
    }
  }

  async putFile({ owner, repo, path, branch, message, content }) {
    const encodedPath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return this.request(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
      method: 'PUT',
      expected: [200, 201],
      body: {
        message,
        branch,
        content: toBase64Utf8(content),
      },
    });
  }

  async createPullRequest({ owner, repo, title, body, head, base }) {
    return this.request(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      expected: [201],
      body: { title, body, head, base },
    });
  }

  async getPullRequest(owner, repo, pullNumber) {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
  }

  async listPullReviews(owner, repo, pullNumber) {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`);
  }

  async mergePullRequest({ owner, repo, pullNumber, commitTitle, mergeMethod = 'squash' }) {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, {
      method: 'PUT',
      expected: [200],
      body: {
        commit_title: commitTitle,
        merge_method: mergeMethod,
      },
    });
  }

  async deleteBranch(owner, repo, branch) {
    return this.request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'DELETE',
      expected: [204],
    });
  }

  async protectBranch(owner, repo, branch) {
    try {
      await this.request(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}/protection`, {
        method: 'PUT',
        expected: [200],
        body: {
          required_status_checks: null,
          enforce_admins: false,
          required_pull_request_reviews: {
            required_approving_review_count: 1,
            dismiss_stale_reviews: true,
            require_code_owner_reviews: false,
          },
          restrictions: null,
          required_linear_history: true,
          allow_force_pushes: false,
          allow_deletions: false,
          block_creations: false,
          required_conversation_resolution: true,
          lock_branch: false,
        },
      });
    } catch (error) {
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return { skipped: true, reason: error.message };
      }
      throw error;
    }

    return { skipped: false };
  }
}

module.exports = { GithubService };
