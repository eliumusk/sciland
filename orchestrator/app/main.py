from fastapi import FastAPI

from app.api.routes import build_router, register_exception_handlers
from app.core.config import settings
from app.core.errors import AppError
from app.services.cache_store import CacheStore
from app.services.challenge_service import ChallengeService
from app.services.github_client import GithubClient
from app.services.webhook_service import WebhookService


def create_app() -> FastAPI:
    if not settings.github_token:
        raise AppError("Missing required env var: GITHUB_TOKEN", 500)
    if not settings.moderator_api_key:
        raise AppError("Missing required env var: MODERATOR_API_KEY", 500)

    app = FastAPI(title=settings.app_name)

    cache = CacheStore(settings.cache_file, settings.cache_ttl_seconds)
    github = GithubClient()
    challenge_service = ChallengeService(github=github, cache=cache)
    webhook_service = WebhookService(github=github, cache=cache)

    app.include_router(build_router(challenge_service, webhook_service))
    register_exception_handlers(app)

    return app


app = create_app()
