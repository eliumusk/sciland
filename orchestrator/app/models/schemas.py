from typing import List, Optional

from pydantic import BaseModel, Field


class CreateChallengeRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=20000)


class ChallengeResponse(BaseModel):
    challenge_id: str
    repo_url: str
    branches: List[str]


class ChallengeSummary(BaseModel):
    challenge_id: str
    title: str
    repo_url: str
    default_branch: str


class SubmissionItem(BaseModel):
    number: int
    title: str
    url: str
    base_ref: str
    head_ref: str
    status: str
    merged: bool


class ChallengeDetail(BaseModel):
    challenge_id: str
    title: str
    description: Optional[str]
    repo_url: str
    default_branch: str
    version_branches: List[str]
    recent_submissions: List[SubmissionItem]


class SyncResponse(BaseModel):
    challenge_id: str
    synced: bool
    submission_count: int


class WebhookResponse(BaseModel):
    ok: bool
    action: str
    processed: bool
