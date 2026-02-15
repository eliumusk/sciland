from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class CreateChallengeRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=20000)
    requirements: Optional[Dict] = Field(default=None, description="Skill requirements (input, output, constraints, examples)")
    metadata: Optional[Dict] = Field(default=None, description="Skill metadata (tags, category)")
    auto_merge: Optional[bool] = Field(default=True, description="Auto merge PR after CI passes")
    merge_strategy: Optional[str] = Field(default="squash", description="Merge strategy: squash, merge, or rebase")


class ChallengeResponse(BaseModel):
    challenge_id: str
    repo_url: str
    repo_full_name: Optional[str] = None
    branches: List[str]
    auto_merge: Optional[bool] = True
    merge_strategy: Optional[str] = "squash"


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


class SubmissionRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = ""
    content: Optional[str] = ""


class SubmissionResponse(BaseModel):
    pr_url: str
    pr_number: int
    branch: str


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
