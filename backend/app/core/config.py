from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = Field(default="SnapTrip API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    database_url: str = Field(
        default="postgresql+psycopg://snaptrip:snaptrip@localhost:5432/snaptrip",
        alias="DATABASE_URL",
    )
    model_path: str = Field(
        default="./models/snaptrip_mobilenetv2.keras",
        alias="MODEL_PATH",
    )
    use_external_place_api: bool = Field(default=False, alias="USE_EXTERNAL_PLACE_API")
    use_llm_planner: bool = Field(default=False, alias="USE_LLM_PLANNER")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
