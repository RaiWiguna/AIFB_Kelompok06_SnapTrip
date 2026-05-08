from __future__ import annotations

from collections import defaultdict

from app.core.categories import CATEGORY_IDS


class MockClassifier:
    def __init__(self, model_version: str):
        self.model_version = model_version

    async def predict(self, images: list[dict]) -> list[dict]:
        category_cycle = ["pantai", "gunung", "air_terjun", "wisata_tradisional"]
        results = []
        for index, image in enumerate(images):
            primary = category_cycle[index % len(category_cycle)]
            scores = {category: 0.05 for category in CATEGORY_IDS}
            scores[primary] = 0.85
            results.append(
                {
                    "image_id": image["id"],
                    "predictions": [
                        {"category": category, "confidence": confidence}
                        for category, confidence in sorted(scores.items())
                    ],
                    "top_category": primary,
                }
            )
        return results


class MobileNetV2Classifier:
    def __init__(self, model_path: str, model_version: str):
        self.model_path = model_path
        self.model_version = model_version

    async def predict(self, images: list[dict]) -> list[dict]:
        try:
            import torch  # noqa: F401
        except ImportError as exc:
            raise RuntimeError("PyTorch is required for real classifier mode") from exc
        raise RuntimeError("Real SnapTrip classifier artifact loading is not implemented yet")


def get_classifier(settings):
    if settings.classifier_mode == "real":
        return MobileNetV2Classifier(settings.classifier_model_path, settings.classifier_model_version)
    return MockClassifier(settings.classifier_model_version)


def aggregate_predictions(per_image: list[dict]) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    counts = 0
    for result in per_image:
        counts += 1
        for prediction in result["predictions"]:
            totals[prediction["category"]] += prediction["confidence"]
    if not counts:
        return []
    aggregated = [
        {"category": category, "confidence": round(total / counts, 4)}
        for category, total in totals.items()
    ]
    return sorted(aggregated, key=lambda item: item["confidence"], reverse=True)
