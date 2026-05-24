import sys
import types as pytypes

import pytest

from app.providers.planner_agent import GeminiPlannerProvider, GeminiValidationFailure


@pytest.mark.asyncio
async def test_gemini_planner_provider_returns_structured_step_without_real_provider(monkeypatch, client):
    install_fake_gemini_planner(
        monkeypatch,
        '{"schema_version":"planner_agent_step.v1","intent":"answer_question",'
        '"assistant_text":"Day 2 is Cibodas and Day 3 is Curug Cibeureum.",'
        '"actions":[],"requires_document_edit":false,"affected_documents":[],"stop":true,'
        '"needs_user_input":false}',
    )
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"

    provider = GeminiPlannerProvider(settings)
    step = await provider.decide({"user_text": "what are the destinations for day 2 and 3?"})

    assert step.intent == "answer_question"
    assert step.requires_document_edit is False
    assert step.actions == []
    assert "Day 2" in step.assistant_text


@pytest.mark.asyncio
async def test_gemini_planner_provider_rejects_invalid_structured_step(monkeypatch, client):
    install_fake_gemini_planner(monkeypatch, '{"schema_version":"planner_agent_step.v1","intent":"not_real"}')
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"

    provider = GeminiPlannerProvider(settings)

    with pytest.raises(GeminiValidationFailure):
        await provider.decide({"user_text": "broken"})


def install_fake_gemini_planner(monkeypatch, response_text: str):
    class FakeClient:
        class models:
            @staticmethod
            def generate_content(*, model, contents, config):
                return pytypes.SimpleNamespace(text=response_text, parsed=None)

    class FakeGenerateContentConfig:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    fake_types = pytypes.SimpleNamespace(
        GenerateContentConfig=FakeGenerateContentConfig,
        SafetySetting=lambda **kwargs: kwargs,
        HarmCategory=pytypes.SimpleNamespace(
            HARM_CATEGORY_DANGEROUS_CONTENT="danger",
            HARM_CATEGORY_HATE_SPEECH="hate",
            HARM_CATEGORY_HARASSMENT="harassment",
            HARM_CATEGORY_SEXUALLY_EXPLICIT="sexual",
        ),
        HarmBlockThreshold=pytypes.SimpleNamespace(BLOCK_LOW_AND_ABOVE="low"),
        Part=pytypes.SimpleNamespace(from_bytes=lambda **kwargs: kwargs),
    )
    fake_genai = pytypes.SimpleNamespace(Client=lambda: FakeClient(), types=fake_types)
    fake_google = pytypes.SimpleNamespace(genai=fake_genai)
    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.genai", fake_genai)
    monkeypatch.setitem(sys.modules, "google.genai.types", fake_types)
