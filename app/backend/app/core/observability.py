from __future__ import annotations

import copy
import hashlib
import json
import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.ids import new_id

logger = logging.getLogger("snaptrip.ai_observability")

RAW_FIELD_NAMES = {"raw_prompt_text", "raw_response_text"}


def now() -> datetime:
    return datetime.now(UTC)


def monotonic_ms() -> float:
    return time.perf_counter() * 1000


def elapsed_ms(start_ms: float) -> int:
    return max(0, round(monotonic_ms() - start_ms))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def text_summary(value: str, *, max_bytes: int, include_raw: bool) -> dict[str, Any]:
    encoded = value.encode("utf-8")
    summary: dict[str, Any] = {
        "sha256": sha256_text(value),
        "bytes": len(encoded),
        "truncated": False,
    }
    if include_raw:
        raw = value
        if len(encoded) > max_bytes:
            raw = encoded[:max_bytes].decode("utf-8", errors="ignore")
            summary["truncated"] = True
            summary["original_bytes"] = len(encoded)
        summary["text"] = raw
    return summary


def image_part_metadata(image_parts: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    metadata = []
    for image in image_parts or []:
        data = image.get("data") or b""
        metadata.append(
            {
                "mime_type": image.get("mime_type"),
                "bytes": len(data),
                "sha256": sha256_bytes(data) if data else None,
            }
        )
    return metadata


def compact_place_coverage(place: dict[str, Any] | None) -> dict[str, Any]:
    place = place or {}
    return {
        "has_id": bool(place.get("id")),
        "has_display_name": bool(place.get("displayName")),
        "has_formatted_address": bool(place.get("formattedAddress")),
        "has_location": bool(place.get("location")),
        "has_rating": place.get("rating") is not None,
        "has_user_rating_count": place.get("userRatingCount") is not None,
        "has_website_uri": bool(place.get("websiteUri")),
        "has_google_maps_uri": bool(place.get("googleMapsUri")),
        "has_reviews": bool(place.get("reviews")),
        "has_photos": bool(place.get("photos")),
        "has_regular_opening_hours": bool(place.get("regularOpeningHours")),
        "has_current_opening_hours": bool(place.get("currentOpeningHours")),
        "has_primary_type_display_name": bool(place.get("primaryTypeDisplayName")),
    }


class AiObservabilityRecorder:
    def __init__(self, *, store, settings):
        self.store = store
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self.settings.ai_observability_enabled)

    @property
    def raw_llm_enabled(self) -> bool:
        return bool(self.enabled and self.settings.ai_raw_llm_observability)

    async def emit(
        self,
        *,
        trace_id: str,
        flow: str,
        stage: str,
        event: str,
        status: str = "ok",
        session_id: str | None = None,
        owner_id: str | None = None,
        request_id: str | None = None,
        run_id: str | None = None,
        duration_ms: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        event_time = now()
        doc = {
            "id": new_id("obs"),
            "trace_id": trace_id,
            "flow": flow,
            "stage": stage,
            "event": event,
            "status": status,
            "session_id": session_id,
            "owner_id": owner_id,
            "request_id": request_id,
            "run_id": run_id,
            "duration_ms": duration_ms,
            "payload": self._normalize_payload(payload or {}),
            "created_at": event_time,
            "expires_at": event_time + timedelta(seconds=self.settings.ai_observability_ttl_seconds),
        }
        try:
            saved = await self.store.save_doc("aiObservabilityEvents", doc)
        except Exception:
            logger.exception("ai_observability_persist_failed")
            saved = None
        self._log_event(doc)
        return saved

    def _normalize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        return normalize_value(payload, max_bytes=self.settings.ai_observability_max_field_bytes)

    def _log_event(self, doc: dict[str, Any]) -> None:
        log_doc = copy.deepcopy(doc)
        if not self.settings.ai_raw_llm_logs:
            remove_raw_text(log_doc)
        logger.info("ai_observability_event %s", json.dumps(log_doc, default=str, ensure_ascii=False))


def normalize_value(value: Any, *, max_bytes: int) -> Any:
    if isinstance(value, bytes):
        return {"bytes": len(value), "sha256": sha256_bytes(value)}
    if isinstance(value, str):
        encoded = value.encode("utf-8")
        if len(encoded) <= max_bytes:
            return value
        return {
            "text": encoded[:max_bytes].decode("utf-8", errors="ignore"),
            "truncated": True,
            "original_bytes": len(encoded),
            "sha256": sha256_text(value),
        }
    if isinstance(value, dict):
        return {key: normalize_value(item, max_bytes=max_bytes) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_value(item, max_bytes=max_bytes) for item in value]
    return value


def remove_raw_text(value: Any) -> None:
    if isinstance(value, dict):
        for key in list(value.keys()):
            if key in RAW_FIELD_NAMES:
                value.pop(key, None)
            else:
                remove_raw_text(value[key])
    elif isinstance(value, list):
        for item in value:
            remove_raw_text(item)
