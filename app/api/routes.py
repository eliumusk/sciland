from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from app.core.auth import require_moderator, require_requester_token
from app.core.config import settings
from app.core.errors import AppError, BadRequestError, UnauthorizedError
from app.models.schemas import (
    ChallengeDetail,
    ChallengeResponse,
    ChallengeSummary,
    CreateChallengeRequest,
    SubmissionItem,
    SyncResponse,
    WebhookResponse,
)
from app.services.challenge_service import ChallengeService
from app.services.webhook_service import WebhookService


def build_router(challenge_service: ChallengeService, webhook_service: WebhookService) -> APIRouter:
    router = APIRouter(prefix="/api/v1")

    @router.get("/health")
    def health():
        return {"success": True, "status": "ok"}

    @router.post("/challenges", response_model=ChallengeResponse)
    def create_challenge(payload: CreateChallengeRequest, _=Depends(require_moderator)):
        return challenge_service.create_challenge(payload.title, payload.description, payload.version_count)

    @router.post("/challenges/request")
    async def create_challenge_by_requester(
        title: str = Form(...),
        description: str = Form(...),
        version_count: int = Form(2),
        problem_file: UploadFile = File(...),
        requester_token: str = Depends(require_requester_token),
    ):
        content = (await problem_file.read()).decode("utf-8", errors="ignore")
        if not content.strip():
            raise BadRequestError("problem file cannot be empty")
        return challenge_service.create_challenge_for_requester(
            title=title,
            description=description,
            requester_token=requester_token,
            problem_filename=problem_file.filename or "problem.md",
            problem_content=content,
            version_count=version_count,
        )

    @router.get("/challenges", response_model=list[ChallengeSummary])
    def list_challenges():
        return challenge_service.list_challenges()

    @router.get("/challenges/{challenge_id}", response_model=ChallengeDetail)
    def get_challenge(challenge_id: str):
        return challenge_service.get_challenge_detail(challenge_id)

    @router.get("/challenges/{challenge_id}/submissions", response_model=list[SubmissionItem])
    def list_submissions(challenge_id: str):
        return challenge_service.list_submissions(challenge_id)

    @router.post("/challenges/{challenge_id}/sync", response_model=SyncResponse)
    def sync_challenge(challenge_id: str, _=Depends(require_moderator)):
        return challenge_service.sync_challenge(challenge_id)

    @router.post("/challenges/{challenge_id}/pulls/{pull_number}/evaluate")
    def evaluate_pull(
        challenge_id: str,
        pull_number: int,
        requester_token: str = Depends(require_requester_token),
    ):
        if not challenge_service.requester_can_operate_pull(challenge_id, pull_number, requester_token):
            raise UnauthorizedError("requester is not allowed to evaluate this pull request")
        return webhook_service.evaluate_pull(
            owner=settings.github_org,
            repo=challenge_id,
            pull_number=pull_number,
        )

    @router.post("/webhooks/github", response_model=WebhookResponse)
    async def github_webhook(
        request: Request,
        x_github_event: str = Header(default=""),
        x_hub_signature_256: str = Header(default=""),
    ):
        raw = await request.body()
        if not webhook_service.verify_signature(raw, x_hub_signature_256):
            raise UnauthorizedError("invalid webhook signature")

        if not x_github_event:
            raise HTTPException(status_code=400, detail="missing x-github-event")

        payload = await request.json()
        result = webhook_service.process(x_github_event, payload)
        return WebhookResponse(ok=result.get("ok", True), action=result.get("action", ""), processed=result.get("processed", False))

    @router.get("/")
    def root():
        return {"name": "SciLand MVP API", "version": "1.0.0"}

    return router


def register_exception_handlers(app):
    @app.exception_handler(AppError)
    async def handle_app_error(_request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.message, "details": exc.details},
        )
