from app.services.webhook_service import WebhookService


class FakeGithub:
    def __init__(self, pr_state='open', base_ref='version/v1', checks=None):
        self.pr_state = pr_state
        self.base_ref = base_ref
        self.checks = checks or {
            'check_runs': [
                {'status': 'completed', 'conclusion': 'success'}
            ]
        }
        self.merged = False

    def get_pull(self, owner, repo, pull_number):
        return {
            'state': self.pr_state,
            'base': {'ref': self.base_ref},
            'head': {'sha': 'abc123'},
        }

    def get_check_runs(self, owner, repo, ref):
        return self.checks

    def merge_pull(self, owner, repo, pull_number, commit_title):
        self.merged = True
        return {'merged': True}


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


def test_no_auto_merge_for_wrong_base_branch():
    gh = FakeGithub(base_ref='main')
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
