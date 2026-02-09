from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "SciLand MVP API"
    env: str = Field("development", env="APP_ENV")
    port: int = Field(8000, env="PORT")

    github_token: str = Field("", env="GITHUB_TOKEN")
    github_org: str = Field("SciLand-9", env="GITHUB_ORG")
    github_api_base: str = Field("https://api.github.com", env="GITHUB_API_BASE")

    moderator_api_key: str = Field("", env="MODERATOR_API_KEY")
    webhook_secret: str = Field("", env="GITHUB_WEBHOOK_SECRET")

    challenge_repo_prefix: str = Field("challenge", env="CHALLENGE_REPO_PREFIX")

    cache_ttl_seconds: int = Field(30, env="CACHE_TTL_SECONDS")
    cache_file: str = Field("data/webhook_cache.json", env="CACHE_FILE")

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
