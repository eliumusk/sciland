/**
 * Moltbook API Test Suite
 * 
 * Run: npm test
 */

const { 
  generateApiKey, 
  generateClaimToken, 
  generateVerificationCode,
  validateApiKey,
  extractToken,
  hashToken
} = require('../src/utils/auth');

const {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError
} = require('../src/utils/errors');

// Test framework
let passed = 0;
let failed = 0;
const tests = [];

function describe(name, fn) {
  tests.push({ type: 'describe', name });
  fn();
}

function test(name, fn) {
  tests.push({ type: 'test', name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

async function runTests() {
  console.log('\nMoltbook API Test Suite\n');
  console.log('='.repeat(50));

  for (const item of tests) {
    if (item.type === 'describe') {
      console.log(`\n[${item.name}]\n`);
    } else {
      try {
        await item.fn();
        console.log(`  + ${item.name}`);
        passed++;
      } catch (error) {
        console.log(`  - ${item.name}`);
        console.log(`    Error: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// Tests

describe('Auth Utils', () => {
  test('generateApiKey creates valid key', () => {
    const key = generateApiKey();
    assert(key.startsWith('scix_'), 'Should have correct prefix');
    assertEqual(key.length, 69, 'Should have correct length');
  });

  test('generateClaimToken creates valid token', () => {
    const token = generateClaimToken();
    assert(token.startsWith('scix_claim_'), 'Should have correct prefix');
  });

  test('generateVerificationCode has correct format', () => {
    const code = generateVerificationCode();
    assert(/^[a-z]+-[A-F0-9]{4}$/.test(code), 'Should match pattern');
  });

  test('validateApiKey accepts valid key', () => {
    const key = generateApiKey();
    assert(validateApiKey(key), 'Should validate generated key');
  });

  test('validateApiKey rejects invalid key', () => {
    assert(!validateApiKey('invalid'), 'Should reject invalid');
    assert(!validateApiKey(null), 'Should reject null');
    assert(!validateApiKey('scix_short'), 'Should reject short key');
  });

  test('extractToken extracts from Bearer header', () => {
    const token = extractToken('Bearer scix_test123');
    assertEqual(token, 'scix_test123');
  });

  test('extractToken returns null for invalid header', () => {
    assertEqual(extractToken('Basic abc'), null);
    assertEqual(extractToken('Bearer'), null);
    assertEqual(extractToken(null), null);
  });

  test('hashToken creates consistent hash', () => {
    const hash1 = hashToken('test');
    const hash2 = hashToken('test');
    assertEqual(hash1, hash2, 'Same input should produce same hash');
  });
});

describe('Error Classes', () => {
  test('ApiError creates with status code', () => {
    const error = new ApiError('Test', 400);
    assertEqual(error.statusCode, 400);
    assertEqual(error.message, 'Test');
  });

  test('BadRequestError has status 400', () => {
    const error = new BadRequestError('Bad input');
    assertEqual(error.statusCode, 400);
  });

  test('NotFoundError has status 404', () => {
    const error = new NotFoundError('User');
    assertEqual(error.statusCode, 404);
    assert(error.message.includes('not found'));
  });

  test('UnauthorizedError has status 401', () => {
    const error = new UnauthorizedError();
    assertEqual(error.statusCode, 401);
  });

  test('ApiError toJSON returns correct format', () => {
    const error = new ApiError('Test', 400, 'TEST_CODE', 'Fix it');
    const json = error.toJSON();
    assertEqual(json.success, false);
    assertEqual(json.error, 'Test');
    assertEqual(json.code, 'TEST_CODE');
    assertEqual(json.hint, 'Fix it');
  });
});

describe('Config', () => {
  test('config loads without error', () => {
    const config = require('../src/config');
    assert(config.port, 'Should have port');
    assert(config.scix.tokenPrefix, 'Should have token prefix');
  });
});

describe('sciland client', () => {
  test('createChallenge calls sciland endpoint with auth', async () => {
    const { createScilandClient } = require('../src/clients/sciland');

    let called = null;
    const fetchImpl = async (url, init) => {
      called = { url, init };
      return {
        ok: true,
        status: 200,
        json: async () => ({ repo_url: 'https://github.com/org/repo', challenge_id: 'abc' })
      };
    };

    const client = createScilandClient({
      baseUrl: 'https://sciland.example.com/',
      apiKey: 'test-key',
      fetchImpl
    });

    const out = await client.createChallenge({ title: 'T', description: 'D' });
    assertEqual(out.repo_url, 'https://github.com/org/repo');

    assert(called, 'fetch should be called');
    assertEqual(called.url, 'https://sciland.example.com/api/v1/challenges');
    assertEqual(called.init.method, 'POST');
    assertEqual(called.init.headers.Authorization, 'Bearer test-key');
    assertEqual(called.init.headers['Content-Type'], 'application/json');

    const body = JSON.parse(called.init.body);
    assertEqual(body.title, 'T');
    assertEqual(body.description, 'D');
  });

  test('createChallenge throws on non-2xx', async () => {
    const { createScilandClient } = require('../src/clients/sciland');

    const fetchImpl = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom'
    });

    const client = createScilandClient({
      baseUrl: 'https://sciland.example.com',
      apiKey: 'test-key',
      fetchImpl
    });

    let threw = false;
    try {
      await client.createChallenge({ title: 'T', description: 'D' });
    } catch (e) {
      threw = true;
      assert(String(e.message).includes('sciland error'), 'should include sciland error');
    }
    assert(threw, 'should throw');
  });
});

describe('sciland webhook handler', () => {
  test('applyScilandWebhook increments merged_pr_count when merged=true', async () => {
    const SkillRepoStatusService = require('../src/services/SkillRepoStatusService');

    let params = null;
    const mockQueryOne = async (sql, p) => {
      params = p;
      return {
        post_id: 'post-1',
        repo_full_name: p[0],
        last_activity_at: 'now',
        merged_pr_count: 3,
        open_pr_count: null,
        updated_at: 'now'
      };
    };

    const out = await SkillRepoStatusService.applyScilandWebhook(
      { repo_full_name: 'org/repo', merged: true },
      { queryOne: mockQueryOne }
    );

    assert(out, 'should return updated row');
    assertEqual(params[0], 'org/repo');
    assertEqual(params[1], 1);
  });

  test('applyScilandWebhook does not increment when merged=false', async () => {
    const SkillRepoStatusService = require('../src/services/SkillRepoStatusService');

    let params = null;
    const mockQueryOne = async (sql, p) => {
      params = p;
      return { post_id: 'post-1', repo_full_name: p[0], merged_pr_count: 2 };
    };

    await SkillRepoStatusService.applyScilandWebhook(
      { repo_full_name: 'org/repo', merged: false },
      { queryOne: mockQueryOne }
    );

    assertEqual(params[1], 0);
  });
});

// Run
runTests();
