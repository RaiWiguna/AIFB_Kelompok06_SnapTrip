from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.local", "app/backend/.env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SnapTrip API"
    app_env: str = "development"
    api_base_url: str = "http://localhost:8000"
    web_base_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    session_secret: str = "local-dev-session-secret-not-for-production"
    cookie_secure: bool = False
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "snaptrip"
    gridfs_bucket: str = "snaptrip_images"
    classifier_model_path: str = "/app/models/snaptrip_mobilenetv2.pt"
    classifier_model_version: str = "2026-05-mvp"
    classifier_mode: str = "mock"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    google_api_key: str = ""
    google_genai_use_vertexai: bool = False
    google_cloud_project: str = ""
    google_cloud_location: str = "global"
    google_places_api_key: str = ""
    use_google_places: bool = False
    use_gemini: bool = False
    ai_provider_timeout_seconds: int = 30
    places_cache_ttl_seconds: int = 604800
    max_upload_image_bytes: int = 8_388_608
    max_upload_images: int = 8
    strict_readiness: bool = False
    storage_backend: str = Field(default="mongo", validation_alias="SNAPTRIP_STORAGE")

    @field_validator("cors_origins")
    @classmethod
    def cors_not_empty(cls, value: str) -> str:
        return value or "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    def validate_runtime(self) -> None:
        if self.is_production and self.session_secret == "local-dev-session-secret-not-for-production":
            raise RuntimeError("SESSION_SECRET must be set in production")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_runtime()
    return settings
