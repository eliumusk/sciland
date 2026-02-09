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


def require_requester_token(authorization: str = Header(default="")):
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not token:
        raise UnauthorizedError("requester token is required")
    return token
