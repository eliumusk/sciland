const { BadRequestError, NotFoundError } = require('../utils/errors');
const { sanitizeIdentifier, slugify, uniqueId } = require('../utils/helpers');

class ChallengeService {
  constructor({ store, github, config }) {
    this.store = store;
    this.github = github;
    this.config = config;
  }

  async listChallenges() {
    return this.store.list();
  }

  async getChallenge(challengeId) {
    const challenge = await this.store.getById(challengeId);
    if (!challenge) {
      throw new NotFoundError('Challenge not found');
    }
    return challenge;
  }

  async createChallenge({ title, description, versions, createdBy }) {
    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle) {
      throw new BadRequestError('title is required');
    }

    const normalizedDescription = String(description || '').trim();
    if (!normalizedDescription) {
      throw new BadRequestError('description is required');
    }

    const normalizedVersions = Array.from(new Set((versions || this.config.defaultVersions)
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)));

    if (normalizedVersions.length === 0) {
      throw new BadRequestError('at least one version is required');
    }

    const challengeId = uniqueId('chal');
    const slug = slugify(normalizedTitle) || challengeId;
    const repoName = `${this.config.repoPrefix}-${slug}-${challengeId.slice(-6)}`.slice(0, 95);

    const repo = await this.github.createRepo({
      name: repoName,
      description: `SciX challenge: ${normalizedTitle}`,
    });

    const defaultBranch = repo.default_branch || 'main';
    const defaultBranchInfo = await this.github.getBranch(repo.owner.login, repo.name, defaultBranch);
    const baseSha = defaultBranchInfo.commit.sha;

    const challengeMarkdown = this._buildChallengeMarkdown({
      title: normalizedTitle,
      description: normalizedDescription,
      versions: normalizedVersions,
      createdBy,
    });

    await this.github.putFile({
      owner: repo.owner.login,
      repo: repo.name,
      path: 'CHALLENGE.md',
      branch: defaultBranch,
      message: 'docs: add challenge specification',
      content: challengeMarkdown,
    });

    for (const version of normalizedVersions) {
      const versionBranch = this.getVersionBranch(version);
      await this.github.ensureBranch(repo.owner.login, repo.name, versionBranch, baseSha);
      await this.github.protectBranch(repo.owner.login, repo.name, versionBranch);
    }

    await this.github.protectBranch(repo.owner.login, repo.name, defaultBranch);

    const challenge = {
      id: challengeId,
      title: normalizedTitle,
      description: normalizedDescription,
      versions: normalizedVersions,
      repo: {
        owner: repo.owner.login,
        name: repo.name,
        htmlUrl: repo.html_url,
        defaultBranch,
      },
      createdBy,
      createdAt: new Date().toISOString(),
    };

    return this.store.create(challenge);
  }

  async submitSolution({ challengeId, participantId, version, content, filePath, title }) {
    const challenge = await this.getChallenge(challengeId);
    const normalizedParticipant = sanitizeIdentifier(participantId);

    if (!normalizedParticipant) {
      throw new BadRequestError('participantId is required');
    }

    const normalizedVersion = String(version || '').trim().toLowerCase();
    if (!challenge.versions.includes(normalizedVersion)) {
      throw new BadRequestError(`version must be one of: ${challenge.versions.join(', ')}`);
    }

    const normalizedContent = String(content || '').trim();
    if (!normalizedContent) {
      throw new BadRequestError('content is required');
    }

    const owner = challenge.repo.owner;
    const repo = challenge.repo.name;
    const baseBranch = this.getVersionBranch(normalizedVersion);
    const branchInfo = await this.github.getBranch(owner, repo, baseBranch);

    const branchName = [
      'submissions',
      normalizedVersion,
      `${normalizedParticipant}-${Date.now().toString(36)}`,
    ].join('/');

    await this.github.createBranch(owner, repo, branchName, branchInfo.commit.sha);

    const submissionFilePath = filePath && String(filePath).trim()
      ? String(filePath).trim()
      : `submissions/${normalizedVersion}/${normalizedParticipant}.md`;

    const payload = this._buildSubmissionMarkdown({
      participantId: normalizedParticipant,
      version: normalizedVersion,
      content: normalizedContent,
    });

    await this.github.putFile({
      owner,
      repo,
      path: submissionFilePath,
      branch: branchName,
      message: `feat(submission): ${normalizedParticipant} -> ${normalizedVersion}`,
      content: payload,
    });

    const pr = await this.github.createPullRequest({
      owner,
      repo,
      title: title?.trim() || `submission(${normalizedVersion}): ${normalizedParticipant}`,
      body: `Automated submission for challenge ${challenge.id}.`,
      head: branchName,
      base: baseBranch,
    });

    return {
      challengeId: challenge.id,
      version: normalizedVersion,
      branch: branchName,
      pullRequest: {
        number: pr.number,
        url: pr.html_url,
        state: pr.state,
      },
    };
  }

  async mergeSubmission({ challengeId, pullNumber, mergedBy, mergeMethod = 'squash' }) {
    const challenge = await this.getChallenge(challengeId);
    const owner = challenge.repo.owner;
    const repo = challenge.repo.name;

    const pr = await this.github.getPullRequest(owner, repo, pullNumber);

    if (pr.state !== 'open') {
      throw new BadRequestError(`pull request #${pullNumber} is not open`);
    }

    const version = this._resolveVersionFromBaseRef(pr.base.ref, challenge.versions);
    if (!version) {
      throw new BadRequestError(`pull request base branch ${pr.base.ref} is not a valid challenge version branch`);
    }

    if (!pr.head.ref.startsWith(`submissions/${version}/`)) {
      throw new BadRequestError('pull request head branch does not follow submissions/<version>/<participant> rule');
    }

    if (this.config.minApprovals > 0) {
      const reviews = await this.github.listPullReviews(owner, repo, pullNumber);
      const approvedCount = this._countApprovals(reviews);

      if (approvedCount < this.config.minApprovals) {
        throw new BadRequestError(
          `pull request requires ${this.config.minApprovals} approvals, current approvals: ${approvedCount}`,
        );
      }
    }

    const mergeResult = await this.github.mergePullRequest({
      owner,
      repo,
      pullNumber,
      commitTitle: `merge: challenge ${challenge.id} PR #${pullNumber} by ${mergedBy}`,
      mergeMethod,
    });

    if (this.config.deleteHeadOnMerge) {
      await this.github.deleteBranch(owner, repo, pr.head.ref);
    }

    return {
      merged: mergeResult.merged,
      message: mergeResult.message,
      sha: mergeResult.sha,
      pullRequestNumber: pullNumber,
    };
  }

  getVersionBranch(version) {
    return `version/${version}`;
  }

  _resolveVersionFromBaseRef(baseRef, versions) {
    for (const version of versions) {
      if (baseRef === this.getVersionBranch(version)) {
        return version;
      }
    }
    return null;
  }

  _countApprovals(reviews) {
    const latestStateByUser = new Map();
    for (const review of reviews || []) {
      if (!review?.user?.login) continue;
      latestStateByUser.set(review.user.login, review.state);
    }

    let approved = 0;
    for (const state of latestStateByUser.values()) {
      if (state === 'APPROVED') approved += 1;
    }
    return approved;
  }

  _buildChallengeMarkdown({ title, description, versions, createdBy }) {
    const lines = [
      `# ${title}`,
      '',
      description,
      '',
      '## Versions',
      ...versions.map((version) => `- ${version} -> target branch: version/${version}`),
      '',
      '## Submission Rules',
      '- Use the submission API only.',
      '- Each submission creates an isolated branch and PR.',
      '- Never force-push or modify other participants branches.',
      '',
      `Created by: ${createdBy}`,
    ];
    return `${lines.join('\n')}\n`;
  }

  _buildSubmissionMarkdown({ participantId, version, content }) {
    return [
      `# Submission by ${participantId}`,
      '',
      `- Version: ${version}`,
      `- Submitted at: ${new Date().toISOString()}`,
      '',
      '## Content',
      '',
      content,
      '',
    ].join('\n');
  }
}

module.exports = { ChallengeService };
