from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from app.core.categories import CATEGORY_IDS
from app.services.classifier import MobileNetV4Classifier, MockClassifier, aggregate_predictions


def image_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (64, 64), color=(42, 120, 180)).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_aggregate_predictions_averages_every_label():
    aggregated = aggregate_predictions(
        [
            {
                "image_id": "img_1",
                "top_category": "pantai",
                "predictions": [
                    {"category": "pantai", "confidence": 0.8},
                    {"category": "gunung", "confidence": 0.1},
                    {"category": "air_terjun", "confidence": 0.05},
                    {"category": "wisata_tradisional", "confidence": 0.05},
                ],
            },
            {
                "image_id": "img_2",
                "top_category": "gunung",
                "predictions": [
                    {"category": "pantai", "confidence": 0.2},
                    {"category": "gunung", "confidence": 0.6},
                    {"category": "air_terjun", "confidence": 0.15},
                    {"category": "wisata_tradisional", "confidence": 0.05},
                ],
            },
        ]
    )

    scores = {item["category"]: item["confidence"] for item in aggregated}
    assert scores == {
        "pantai": 0.5,
        "gunung": 0.35,
        "air_terjun": 0.1,
        "wisata_tradisional": 0.05,
    }
    assert aggregated[0]["category"] == "pantai"


@pytest.mark.asyncio
async def test_mock_classifier_returns_all_canonical_labels():
    classifier = MockClassifier("test-model")
    predictions = await classifier.predict([{"id": "img_1"}])

    assert predictions[0]["top_category"] == "pantai"
    assert {item["category"] for item in predictions[0]["predictions"]} == set(CATEGORY_IDS)


@pytest.mark.asyncio
async def test_real_classifier_loads_v2_checkpoint_on_cpu():
    repo_root = Path(__file__).resolve().parents[3]
    model_path = repo_root / "training/output/model/snaptrip_mobilenetv4_medium_v2_best.pth"
    classifier = MobileNetV4Classifier(
        str(model_path),
        "2026-05-mvp-mobilenetv4-medium-v2",
    )

    predictions = await classifier.predict([{"id": "img_real", "bytes": image_bytes()}])

    per_image = predictions[0]
    assert per_image["image_id"] == "img_real"
    assert per_image["top_category"] in CATEGORY_IDS
    assert {item["category"] for item in per_image["predictions"]} == set(CATEGORY_IDS)
    assert abs(sum(item["confidence"] for item in per_image["predictions"]) - 1.0) < 0.001
