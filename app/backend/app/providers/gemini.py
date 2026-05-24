from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from app.ai.prompts.destination_recommendation import (
    FINALIZATION_SYSTEM_INSTRUCTION,
    SELECTION_SYSTEM_INSTRUCTION,
    SYSTEM_INSTRUCTION,
    render_context,
    render_repair_prompt,
)
from app.schemas.recommendations import (
    DestinationCardFinalizationOutputV1,
    DestinationSeedSelectionOutputV1,
    RecommendationRunOutputV1,
)


@dataclass
class GeminiValidationFailure(Exception):
    message: str
    raw_output: str


class GeminiRecommendationProvider:
    def __init__(self, settings):
        self.settings = settings

    @property
    def enabled(self) -> bool:
        has_developer_key = bool(self.settings.gemini_api_key or self.settings.google_api_key)
        has_vertex_config = bool(
            self.settings.google_genai_use_vertexai
            and self.settings.google_cloud_project
            and self.settings.google_cloud_location
        )
        return bool(self.settings.use_gemini and self.settings.gemini_model and (has_developer_key or has_vertex_config))

    async def generate(self, context: dict[str, Any]) -> RecommendationRunOutputV1:
        return await self._generate_from_prompt(
            render_context(context),
            schema_model=RecommendationRunOutputV1,
            system_instruction=SYSTEM_INSTRUCTION,
        )

    async def select_destinations(
        self,
        context: dict[str, Any],
        image_parts: list[dict[str, Any]] | None = None,
    ) -> DestinationSeedSelectionOutputV1:
        return await self._generate_from_prompt(
            render_context(context),
            schema_model=DestinationSeedSelectionOutputV1,
            system_instruction=SELECTION_SYSTEM_INSTRUCTION,
            image_parts=image_parts or [],
        )

    async def finalize_cards(self, context: dict[str, Any]) -> DestinationCardFinalizationOutputV1:
        return await self._generate_from_prompt(
            render_context(context),
            schema_model=DestinationCardFinalizationOutputV1,
            system_instruction=FINALIZATION_SYSTEM_INSTRUCTION,
        )

    async def repair(
        self,
        *,
        context: dict[str, Any],
        validation_errors: str,
        previous_output: str,
    ) -> RecommendationRunOutputV1:
        return await self._generate_from_prompt(
            render_repair_prompt(
                validation_errors=validation_errors,
                previous_output=previous_output,
                original_context=context,
            ),
            schema_model=RecommendationRunOutputV1,
            system_instruction=SYSTEM_INSTRUCTION,
        )

    async def _generate_from_prompt(
        self,
        prompt: str,
        *,
        schema_model,
        system_instruction: str,
        image_parts: list[dict[str, Any]] | None = None,
    ):
        if not self.enabled:
            raise GeminiValidationFailure("Gemini provider is disabled.", "")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise GeminiValidationFailure("google-genai is not installed.", "") from exc

        configure_google_genai_environment(self.settings)
        client = genai.Client()
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=schema_model.model_json_schema(),
            system_instruction=system_instruction,
            safety_settings=[
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                ),
            ],
        )
        contents: Any = prompt
        if image_parts:
            parts: list[Any] = [prompt]
            for image in image_parts:
                data = image.get("data")
                mime_type = image.get("mime_type")
                if data and mime_type:
                    parts.append(types.Part.from_bytes(data=data, mime_type=mime_type))
            contents = parts

        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self.settings.gemini_model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            raise GeminiValidationFailure(f"Gemini provider request failed: {exc}", "") from exc
        raw_output = response.text or ""
        if not raw_output:
            raise GeminiValidationFailure("Gemini returned an empty or blocked response.", raw_output)

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, schema_model):
            return parsed
        try:
            if isinstance(parsed, dict):
                return schema_model.model_validate(parsed)
            return schema_model.model_validate_json(raw_output)
        except (ValidationError, json.JSONDecodeError) as exc:
            raise GeminiValidationFailure(str(exc), raw_output) from exc


def configure_google_genai_environment(settings) -> None:
    if settings.gemini_api_key:
        os.environ.setdefault("GEMINI_API_KEY", settings.gemini_api_key)
    if settings.google_api_key:
        os.environ.setdefault("GOOGLE_API_KEY", settings.google_api_key)
    if settings.google_genai_use_vertexai:
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
    if settings.google_cloud_project:
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.google_cloud_project)
    if settings.google_cloud_location:
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", settings.google_cloud_location)
