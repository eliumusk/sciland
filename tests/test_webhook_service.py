from app.services.webhook_service import WebhookService


class FakeGithub:
    def __init__(self, pr_state='open', base_ref='main', checks=None):
        self.pr_state = pr_state
        self.base_ref = base_ref
        self.checks = checks or {
            'check_runs': [
                {'status': 'completed', 'conclusion': 'success'}
            ]
        }
        self.merged = False
        self.tags = []
        self.created_tags = []
        self.created_comments = []

    def get_pull(self, owner, repo, pull_number):
        return {
            'state': self.pr_state,
            'base': {'ref': self.base_ref},
            'head': {'sha': 'abc123'},
            'user': {'login': 'alice'},
            'body': 'Summary (EN): add feature X',
        }

    def get_check_runs(self, owner, repo, ref):
        return self.checks

    def approve_action_required_runs_for_sha(self, owner, repo, sha):
        return None

    def merge_pull(self, owner, repo, pull_number, commit_title):
        self.merged = True
        return {'merged': True, 'sha': 'merge-sha-1'}

    def list_tags(self, owner, repo, per_page=100):
        # GitHub API returns commit.sha for each tag.
        return [{'name': name, 'commit': {'sha': sha}} for (name, sha) in self.tags]

    def create_tag(self, owner, repo, tag, sha):
        self.created_tags.append((tag, sha))
        self.tags.append((tag, sha))
        return {'ref': f'refs/tags/{tag}', 'sha': sha}

    def list_issue_comments(self, owner, repo, issue_number, per_page=100):
        return [{'body': body} for body in self.created_comments]

    def create_issue_comment(self, owner, repo, issue_number, body):
        self.created_comments.append(body)
        return {'id': 1}


class FakeCache:
    def clear(self, key):
        return None


def test_auto_merge_when_checks_success():
    gh = FakeGithub()
    svc = WebhookService(gh, FakeCache())

    payload = {
        'action': 'opened',
        'repository': {'name': 'challenge-test-123', 'owner': {'login': 'SciX-Skill'}},
        'pull_request': {'number': 1},
    }

    result = svc.process('pull_request', payload)
    assert result['processed'] is True
    assert gh.merged is True
    assert gh.created_tags == [('v1', 'merge-sha-1')]
    assert any('has uploaded version **v1**' in body for body in gh.created_comments)


def test_no_auto_merge_for_wrong_base_branch():
    gh = FakeGithub(base_ref='version/v1')
    svc = WebhookService(gh, FakeCache())

    payload = {
        'action': 'opened',
        'repository': {'name': 'challenge-test-123', 'owner': {'login': 'SciX-Skill'}},
        'pull_request': {'number': 1},
    }

    svc.process('pull_request', payload)
    assert gh.merged is False


def test_signature_optional_when_secret_empty(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, 'webhook_secret', '')
    gh = FakeGithub()
    svc = WebhookService(gh, FakeCache())

    assert svc.verify_signature(b'{}', '') is True


def test_evaluate_pull_calls_auto_merge_logic():
    gh = FakeGithub()
    svc = WebhookService(gh, FakeCache())
    result = svc.evaluate_pull('SciX-Skill', 'challenge-test-123', 1)
    assert result['processed'] is True
    assert result['merged'] is True
