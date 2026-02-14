from app.services.challenge_service import ChallengeService


class FakeGithub:
    def __init__(self):
        self.created_repo = None

    def create_org_repo(self, name, description):
        self.created_repo = name
        return {
            'name': name,
            'html_url': f'https://github.com/SciLand-9/{name}',
            'default_branch': 'main',
            'owner': {'login': 'SciLand-9'},
        }

    def get_branch(self, owner, repo, branch):
        return {'commit': {'sha': 'abc123'}}

    def put_file(self, owner, repo, branch, path, content, message):
        return {'ok': True}

    def ensure_branch(self, owner, repo, branch, base_sha):
        return {'ok': True}

    def protect_branch(self, owner, repo, branch):
        return {'ok': True}

    def list_org_repos(self):
        return [
            {
                'name': 'challenge-demo-abc123',
                'description': 'SciLand challenge: Demo',
                'html_url': 'https://github.com/SciLand-9/challenge-demo-abc123',
                'default_branch': 'main',
            },
            {
                'name': 'random-repo',
                'description': 'x',
                'html_url': 'https://github.com/SciLand-9/random-repo',
                'default_branch': 'main',
            },
        ]

    def get_repo(self, owner, repo):
        return {
            'description': 'SciLand challenge: Demo',
            'html_url': f'https://github.com/{owner}/{repo}',
            'default_branch': 'main',
        }

    def list_pulls(self, owner, repo, state='all', per_page=20):
        return [
            {
                'number': 1,
                'title': 'submission(v1): test',
                'html_url': f'https://github.com/{owner}/{repo}/pull/1',
                'base': {'ref': 'version/v1'},
                'head': {'ref': 'submissions/v1/user-a'},
                'state': 'open',
                'merged_at': None,
            }
        ]

    def get_repo_readme(self, owner, repo):
        return '# Demo'


class FakeCache:
    def __init__(self):
        self.data = {}

    def get(self, key):
        return self.data.get(key)

    def set(self, key, value):
        self.data[key] = value

    def clear(self, key):
        self.data.pop(key, None)


def test_create_challenge_returns_repo_based_challenge_id():
    service = ChallengeService(FakeGithub(), FakeCache())
    result = service.create_challenge('My Challenge', 'Long enough description for challenge creation.')
    assert result['challenge_id'].startswith('challenge-my-challenge-')
    assert 'version/v1' in result['branches']
    assert 'version/v2' in result['branches']


def test_list_challenges_filters_non_challenge_repos():
    service = ChallengeService(FakeGithub(), FakeCache())
    items = service.list_challenges()
    assert len(items) == 1
    assert items[0]['challenge_id'] == 'challenge-demo-abc123'
