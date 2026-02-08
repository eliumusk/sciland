from fastapi import Header

from app.core.config import settings
from app.core.errors import UnauthorizedError


def require_moderator(authorization: str = Header(default="")):
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not token or token != settings.moderator_api_key:
        raise UnauthorizedError("moderator API key is required")
    return True


def require_requester(authorization: str = Header(default="")):
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not settings.github_token2:
        raise UnauthorizedError("requester auth is not configured")
    if not token or token != settings.github_token2:
        raise UnauthorizedError("requester token is required")
    return True
