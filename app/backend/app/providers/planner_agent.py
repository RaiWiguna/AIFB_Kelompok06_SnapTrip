from __future__ import annotations

import json
from typing import Any

from app.ai.prompts.planner_agent import PLANNER_AGENT_SYSTEM_V1, PLANNER_REPAIR_V1
from app.providers.gemini import GeminiRecommendationProvider, GeminiValidationFailure
from app.schemas.planner import PlannerAgentStepV1


class GeminiPlannerProvider:
    def __init__(self, settings, observability=None):
        self.settings = settings
        self._provider = GeminiRecommendationProvider(settings, observability=observability)

    @property
    def enabled(self) -> bool:
        return self._provider.enabled

    async def decide(
        self,
        context: dict[str, Any],
        trace_context: dict[str, Any] | None = None,
    ) -> PlannerAgentStepV1:
        return await self._provider._generate_from_prompt(
            render_planner_context(context),
            schema_model=PlannerAgentStepV1,
            system_instruction=PLANNER_AGENT_SYSTEM_V1,
            trace_context=trace_context,
        )

    async def repair(
        self,
        *,
        context: dict[str, Any],
        validation_errors: str,
        previous_output: str,
        trace_context: dict[str, Any] | None = None,
    ) -> PlannerAgentStepV1:
        prompt = "\n\n".join(
            [
                PLANNER_REPAIR_V1,
                "Planner context:",
                render_planner_context(context),
                "Validation errors:",
                validation_errors,
                "Invalid output:",
                previous_output,
            ]
        )
        return await self._provider._generate_from_prompt(
            prompt,
            schema_model=PlannerAgentStepV1,
            system_instruction=PLANNER_AGENT_SYSTEM_V1,
            trace_context=trace_context,
        )


def render_planner_context(context: dict[str, Any]) -> str:
    return json.dumps(context, ensure_ascii=False, default=str, sort_keys=True)


__all__ = ["GeminiPlannerProvider", "GeminiValidationFailure"]
