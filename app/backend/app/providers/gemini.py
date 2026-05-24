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
from app.core.observability import elapsed_ms, image_part_metadata, monotonic_ms, sha256_text
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
    def __init__(self, settings, observability=None):
        self.settings = settings
        self.observability = observability

    @property
    def enabled(self) -> bool:
        has_developer_key = bool(self.settings.gemini_api_key or self.settings.google_api_key)
        has_vertex_config = bool(
            self.settings.google_genai_use_vertexai
            and self.settings.google_cloud_project
            and self.settings.google_cloud_location
        )
        return bool(self.settings.use_gemini and self.settings.gemini_model and (has_developer_key or has_vertex_config))

    async def generate(self, context: dict[str, Any], trace_context: dict[str, Any] | None = None) -> RecommendationRunOutputV1:
        return await self._generate_from_prompt(
            render_context(context),
            schema_model=RecommendationRunOutputV1,
            system_instruction=SYSTEM_INSTRUCTION,
            trace_context=trace_context,
        )

    async def select_destinations(
        self,
        context: dict[str, Any],
        image_parts: list[dict[str, Any]] | None = None,
        trace_context: dict[str, Any] | None = None,
    ) -> DestinationSeedSelectionOutputV1:
        return await self._generate_from_prompt(
            render_context(context),
            schema_model=DestinationSeedSelectionOutputV1,
            system_instruction=SELECTION_SYSTEM_INSTRUCTION,
            image_parts=image_parts or [],
            trace_context=trace_context,
        )

    async def finalize_cards(
        self,
        context: dict[str, Any],
        trace_context: dict[str, Any] | None = None,
    ) -> DestinationCardFinalizationOutputV1:
        return await self._generate_from_prompt(
            render_context(context),
            schema_model=DestinationCardFinalizationOutputV1,
            system_instruction=FINALIZATION_SYSTEM_INSTRUCTION,
            trace_context=trace_context,
        )

    async def repair(
        self,
        *,
        context: dict[str, Any],
        validation_errors: str,
        previous_output: str,
        trace_context: dict[str, Any] | None = None,
    ) -> RecommendationRunOutputV1:
        return await self._generate_from_prompt(
            render_repair_prompt(
                validation_errors=validation_errors,
                previous_output=previous_output,
                original_context=context,
            ),
            schema_model=RecommendationRunOutputV1,
            system_instruction=SYSTEM_INSTRUCTION,
            trace_context=trace_context,
        )

    async def _generate_from_prompt(
        self,
        prompt: str,
        *,
        schema_model,
        system_instruction: str,
        image_parts: list[dict[str, Any]] | None = None,
        trace_context: dict[str, Any] | None = None,
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

        start_ms = monotonic_ms()
        await self._emit(
            trace_context,
            event=f"{event_prefix(trace_context)}_prompt_prepared",
            stage=stage_name(trace_context),
            status="ok",
            payload={
                "model": self.settings.gemini_model,
                "schema_model": schema_model.__name__,
                "prompt_sha256": sha256_text(prompt),
                "prompt_bytes": len(prompt.encode("utf-8")),
                "raw_prompt_text": prompt if self._raw_llm_enabled else None,
                "image_count": len(image_parts or []),
                "image_parts": image_part_metadata(image_parts),
            },
        )

        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self.settings.gemini_model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            await self._emit(
                trace_context,
                event=f"{event_prefix(trace_context)}_completed",
                stage=stage_name(trace_context),
                status="error",
                duration_ms=elapsed_ms(start_ms),
                payload={
                    "model": self.settings.gemini_model,
                    "schema_model": schema_model.__name__,
                    "error_class": exc.__class__.__name__,
                    "safe_message": "Gemini provider request failed",
                },
            )
            raise GeminiValidationFailure(f"Gemini provider request failed: {exc}", "") from exc
        raw_output = response.text or ""
        if not raw_output:
            await self._emit(
                trace_context,
                event=f"{event_prefix(trace_context)}_completed",
                stage=stage_name(trace_context),
                status="error",
                duration_ms=elapsed_ms(start_ms),
                payload={
                    "model": self.settings.gemini_model,
                    "schema_model": schema_model.__name__,
                    "response_bytes": 0,
                    "safe_message": "Gemini returned an empty or blocked response.",
                },
            )
            raise GeminiValidationFailure("Gemini returned an empty or blocked response.", raw_output)

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, schema_model):
            await self._emit_completion(trace_context, schema_model, raw_output, elapsed_ms(start_ms), "ok")
            return parsed
        try:
            if isinstance(parsed, dict):
                result = schema_model.model_validate(parsed)
            else:
                result = schema_model.model_validate_json(raw_output)
            await self._emit_completion(trace_context, schema_model, raw_output, elapsed_ms(start_ms), "ok")
            return result
        except (ValidationError, json.JSONDecodeError) as exc:
            safe_error = safe_validation_error(exc)
            await self._emit_completion(
                trace_context,
                schema_model,
                raw_output,
                elapsed_ms(start_ms),
                "validation_failed",
                safe_error,
            )
            raise GeminiValidationFailure(safe_error["safe_message"], raw_output) from exc

    @property
    def _raw_llm_enabled(self) -> bool:
        return bool(self.observability and self.observability.raw_llm_enabled)

    async def _emit_completion(
        self,
        trace_context: dict[str, Any] | None,
        schema_model,
        raw_output: str,
        duration_ms: int,
        status: str,
        extra: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            "model": self.settings.gemini_model,
            "schema_model": schema_model.__name__,
            "response_sha256": sha256_text(raw_output),
            "response_bytes": len(raw_output.encode("utf-8")),
            "raw_response_text": raw_output if self._raw_llm_enabled else None,
        }
        payload.update(extra or {})
        await self._emit(
            trace_context,
            event=f"{event_prefix(trace_context)}_completed",
            stage=stage_name(trace_context),
            status=status,
            duration_ms=duration_ms,
            payload=payload,
        )

    async def _emit(
        self,
        trace_context: dict[str, Any] | None,
        *,
        event: str,
        stage: str,
        status: str,
        payload: dict[str, Any],
        duration_ms: int | None = None,
    ) -> None:
        if not self.observability or not trace_context:
            return
        await self.observability.emit(
            trace_id=trace_context["trace_id"],
            flow=trace_context.get("flow", "flow2"),
            stage=stage,
            event=event,
            status=status,
            session_id=trace_context.get("session_id"),
            owner_id=trace_context.get("owner_id"),
            request_id=trace_context.get("request_id"),
            run_id=trace_context.get("run_id"),
            duration_ms=duration_ms,
            payload={key: value for key, value in payload.items() if value is not None},
        )


def event_prefix(trace_context: dict[str, Any] | None) -> str:
    return (trace_context or {}).get("event_prefix") or "gemini"


def stage_name(trace_context: dict[str, Any] | None) -> str:
    return (trace_context or {}).get("stage") or "gemini"


def safe_validation_error(exc: Exception) -> dict[str, Any]:
    if isinstance(exc, ValidationError):
        errors = exc.errors(include_input=False, include_context=False, include_url=False)
        return {
            "error_class": exc.__class__.__name__,
            "safe_message": "Gemini output validation failed.",
            "error_count": len(errors),
            "errors": [
                {
                    "loc": [str(part) for part in error.get("loc", [])],
                    "type": error.get("type"),
                    "message": error.get("msg"),
                }
                for error in errors
            ],
        }
    return {
        "error_class": exc.__class__.__name__,
        "safe_message": "Gemini output JSON parsing failed.",
        "error_count": 1,
        "errors": [{"loc": [], "type": exc.__class__.__name__, "message": "Invalid JSON response."}],
    }


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
