from app.ai.prompts.planner_agent import (
    PLANNER_ACTION_SELECTION_V1,
    PLANNER_AGENT_SYSTEM_V1,
    PLANNER_CONTEXT_BUILDER_V1,
    PLANNER_GROUNDED_RESEARCH_V1,
    PLANNER_REPAIR_V1,
    PLANNER_TOOL_POLICY_V1,
)


def test_planner_prompt_defines_stateful_agent_contract():
    prompt = PLANNER_AGENT_SYSTEM_V1

    assert "stateful AI Trip Planner agent" in prompt
    assert "trip_memo.v1" in prompt
    assert "full_itinerary.v1" in prompt
    assert "budget_plan.v1" in prompt
    assert "Return only planner_agent_step.v1 JSON" in prompt
    assert "assistant prose as the source of truth" in prompt
    assert "Places Text" in prompt
    assert "grounded web research" in prompt
    assert "Agent behavior policy" in prompt
    assert "observe -> decide -> act -> validate -> respond" in prompt
    assert "Readiness behavior" in prompt
    assert "ready for review only when" in prompt


def test_planner_tool_policy_keeps_required_tool_catalog():
    required_tools = {
        "read_trip_context",
        "read_documents",
        "replace_trip_memo",
        "replace_full_itinerary",
        "replace_budget_plan",
        "patch_itinerary_day",
        "patch_budget_category",
        "patch_memo_section",
        "validate_documents",
        "places_text_search",
        "places_details",
        "grounded_web_research",
        "compute_budget_summary",
        "finish_response",
        "request_clarification",
    }

    assert set(PLANNER_TOOL_POLICY_V1["tools"]) == required_tools
    assert set(PLANNER_TOOL_POLICY_V1["tool_catalog"]) == required_tools
    assert PLANNER_TOOL_POLICY_V1["max_llm_turns_per_run"] == 8
    assert PLANNER_TOOL_POLICY_V1["max_tool_calls_per_run"] == 12

    mutating_tools = {
        tool
        for tool, config in PLANNER_TOOL_POLICY_V1["tool_catalog"].items()
        if config["mutates_state"]
    }
    assert mutating_tools == {
        "replace_trip_memo",
        "replace_full_itinerary",
        "replace_budget_plan",
        "patch_itinerary_day",
        "patch_budget_category",
        "patch_memo_section",
    }


def test_planner_support_prompts_cover_context_repair_research_and_flow():
    assert "Immutable trip facts" in PLANNER_CONTEXT_BUILDER_V1
    assert "Latest valid canonical documents" in PLANNER_CONTEXT_BUILDER_V1
    assert "Do not invent observations" in PLANNER_REPAIR_V1
    assert "validate_documents after the mutation actions" in PLANNER_REPAIR_V1
    assert "accommodation price ranges" in PLANNER_GROUNDED_RESEARCH_V1
    assert "Initial auto-run" in PLANNER_ACTION_SELECTION_V1
    assert "Global per-run loop" in PLANNER_ACTION_SELECTION_V1
    assert "User adds a destination" in PLANNER_ACTION_SELECTION_V1
    assert "Duration/date behavior" in PLANNER_ACTION_SELECTION_V1
    assert "Budget behavior" in PLANNER_ACTION_SELECTION_V1
    assert "hard constraints" in PLANNER_ACTION_SELECTION_V1
    assert "Fixed total and fixed per-person budgets must match exactly" in PLANNER_ACTION_SELECTION_V1
    assert "Max total, max per-person, and daily-cap budgets must not be exceeded" in PLANNER_ACTION_SELECTION_V1
    assert "budget_mode" in PLANNER_ACTION_SELECTION_V1
    assert "Preference-only changes" in PLANNER_ACTION_SELECTION_V1
    assert "Review-readiness request" in PLANNER_ACTION_SELECTION_V1
    assert "Unsupported action" in PLANNER_ACTION_SELECTION_V1
    assert "Clarification cases" in PLANNER_ACTION_SELECTION_V1
