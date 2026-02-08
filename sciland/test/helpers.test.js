const test = require('node:test');
const assert = require('node:assert/strict');

const { slugify, sanitizeIdentifier } = require('../src/utils/helpers');
const { ChallengeService } = require('../src/services/challenge.service');

test('slugify normalizes title', () => {
  assert.equal(slugify('  Hello, SciLand API !! '), 'hello-sciland-api');
});

test('sanitizeIdentifier keeps safe chars', () => {
  assert.equal(sanitizeIdentifier('User@Name#1'), 'user-name-1');
});

test('ChallengeService resolves valid version from branch', () => {
  const service = new ChallengeService({
    store: {},
    github: {},
    config: { defaultVersions: ['v1'], repoPrefix: 'challenge', minApprovals: 0, deleteHeadOnMerge: true },
  });

  assert.equal(service._resolveVersionFromBaseRef('version/v2', ['v1', 'v2']), 'v2');
  assert.equal(service._resolveVersionFromBaseRef('main', ['v1', 'v2']), null);
});

test('ChallengeService counts latest approvals correctly', () => {
  const service = new ChallengeService({
    store: {},
    github: {},
    config: { defaultVersions: ['v1'], repoPrefix: 'challenge', minApprovals: 0, deleteHeadOnMerge: true },
  });

  const reviews = [
    { user: { login: 'alice' }, state: 'APPROVED' },
    { user: { login: 'bob' }, state: 'COMMENTED' },
    { user: { login: 'alice' }, state: 'DISMISSED' },
    { user: { login: 'charlie' }, state: 'APPROVED' },
  ];

  assert.equal(service._countApprovals(reviews), 1);
});
