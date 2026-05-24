from __future__ import annotations

from collections import defaultdict
from functools import cached_property, lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

from app.core.categories import CANONICAL_CATEGORIES

CATEGORY_ORDER = [category["id"] for category in CANONICAL_CATEGORIES]


class MockClassifier:
    def __init__(self, model_version: str):
        self.model_version = model_version

    async def predict(self, images: list[dict]) -> list[dict]:
        category_cycle = CATEGORY_ORDER
        results = []
        for index, image in enumerate(images):
            primary = category_cycle[index % len(category_cycle)]
            scores = {category: 0.05 for category in CATEGORY_ORDER}
            scores[primary] = 0.85
            results.append(
                {
                    "image_id": image["id"],
                    "predictions": [
                        {"category": category, "confidence": confidence}
                        for category, confidence in scores.items()
                    ],
                    "top_category": primary,
                }
            )
        return results


class MobileNetV4Classifier:
    model_name = "mobilenetv4_conv_medium.e500_r224_in1k"

    def __init__(self, model_path: str, model_version: str):
        self.model_path = model_path
        self.model_version = model_version

    @cached_property
    def _runtime(self) -> dict[str, Any]:
        try:
            import timm
            import torch
            from torchvision import transforms
        except ImportError as exc:
            raise RuntimeError("PyTorch, torchvision, and timm are required for real classifier mode") from exc

        path = Path(self.model_path)
        if not path.exists():
            raise RuntimeError(f"Classifier model artifact not found: {path}")

        checkpoint = torch.load(path, map_location="cpu")
        classes = checkpoint.get("classes") or CATEGORY_ORDER
        if list(classes) != CATEGORY_ORDER:
            raise RuntimeError("Classifier checkpoint classes do not match SnapTrip categories")

        model = timm.create_model(self.model_name, pretrained=False, num_classes=len(CATEGORY_ORDER))
        state_dict = checkpoint.get("model_state_dict") or checkpoint
        model.load_state_dict(state_dict)
        model.to("cpu")
        model.eval()

        preprocessing = checkpoint.get("preprocessing") or {}
        resize = int(preprocessing.get("resize", 256))
        crop = int(preprocessing.get("crop", 224))
        mean = preprocessing.get("mean", [0.485, 0.456, 0.406])
        std = preprocessing.get("std", [0.229, 0.224, 0.225])
        transform = transforms.Compose(
            [
                transforms.Resize((resize, resize)),
                transforms.CenterCrop(crop),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )
        return {"torch": torch, "model": model, "transform": transform}

    async def predict(self, images: list[dict]) -> list[dict]:
        from PIL import Image, UnidentifiedImageError

        runtime = self._runtime
        torch = runtime["torch"]
        model = runtime["model"]
        transform = runtime["transform"]

        tensors = []
        image_ids = []
        for image in images:
            data = image.get("bytes")
            if not data:
                raise RuntimeError(f"Image bytes are unavailable for classifier input: {image.get('id')}")
            try:
                pil_image = Image.open(BytesIO(data)).convert("RGB")
            except (SyntaxError, UnidentifiedImageError, OSError) as exc:
                raise RuntimeError(f"Invalid image bytes for classifier input: {image.get('id')}") from exc
            tensors.append(transform(pil_image))
            image_ids.append(image["id"])

        if not tensors:
            return []

        batch = torch.stack(tensors).to("cpu")
        with torch.inference_mode():
            probabilities = torch.softmax(model(batch), dim=1).cpu().tolist()

        results = []
        for image_id, scores in zip(image_ids, probabilities, strict=True):
            predictions = [
                {"category": category, "confidence": float(scores[index])}
                for index, category in enumerate(CATEGORY_ORDER)
            ]
            predictions = sorted(predictions, key=lambda item: item["confidence"], reverse=True)
            results.append(
                {
                    "image_id": image_id,
                    "predictions": predictions,
                    "top_category": predictions[0]["category"],
                }
            )
        return results


@lru_cache(maxsize=4)
def _real_classifier(model_path: str, model_version: str) -> MobileNetV4Classifier:
    return MobileNetV4Classifier(model_path, model_version)


def get_classifier(settings):
    if settings.classifier_mode == "real":
        return _real_classifier(settings.classifier_model_path, settings.classifier_model_version)
    return MockClassifier(settings.classifier_model_version)


def aggregate_predictions(per_image: list[dict]) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    counts = 0
    for result in per_image:
        counts += 1
        seen_categories = set()
        for prediction in result["predictions"]:
            seen_categories.add(prediction["category"])
            totals[prediction["category"]] += prediction["confidence"]
        for category in CATEGORY_ORDER:
            if category not in seen_categories:
                totals[category] += 0.0
    if not counts:
        return []
    aggregated = [
        {"category": category, "confidence": round(total / counts, 4)}
        for category in CATEGORY_ORDER
        for total in [totals[category]]
    ]
    return sorted(aggregated, key=lambda item: item["confidence"], reverse=True)
