# 0011 Real Image Classification Runtime Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-24 |
| Decision scope | CPU MobileNetV4 Medium classifier runtime, model packaging, upload validation, and classification display contract |

## Context

SnapTrip already had trip creation sessions, GridFS-backed image storage, mock classification, category confirmation, and frontend preference review screens. The real classifier path was still a placeholder, while the trained MobileNetV4 Medium v2 artifact existed under `training/output/model/`.

The immediate product slice requires the upload-to-classification flow to use the trained model on CPU and show all per-label confidences. Destination recommendations and the agentic planner remain separate later work.

## Decision

- Real classifier mode uses the tracked `snaptrip_mobilenetv4_medium_v2_best.pth` checkpoint.
- Backend Docker images copy the model to `/app/models/snaptrip_mobilenetv4_medium_v2_best.pth`.
- Production env renders:
  - `CLASSIFIER_MODE=real`
  - `CLASSIFIER_MODEL_PATH=/app/models/snaptrip_mobilenetv4_medium_v2_best.pth`
  - `CLASSIFIER_MODEL_VERSION=2026-05-mvp-mobilenetv4-medium-v2`
- Local development and automated tests still default to `CLASSIFIER_MODE=mock` unless real mode is explicitly configured.
- The real classifier is loaded lazily and cached in-process, runs on CPU, and uses `timm`, PyTorch, torchvision, and the checkpoint preprocessing contract.
- Torch and torchvision are pinned to the PyTorch CPU wheel index through `uv` sources.
- Uploads validate JPG/PNG bytes before persistence and enforce a maximum of eight images across the trip creation session.
- Classification responses preserve the existing API shape while returning all four canonical category confidences for every image and averaged aggregate scores for the session.
- The frontend shows full per-image label confidences plus the aggregate Trip preferences card. The default confirmed category is the highest averaged label, with manual override still available.

## Rationale

Keeping real inference inside the FastAPI process avoids adding queue infrastructure for a small MVP batch size of at most eight images. CPU-only wheels keep runtime packaging aligned with the single-VM deployment target and avoid unnecessary GPU dependencies.

Preserving the API shape keeps Phase 7 frontend/backend integration stable while improving the confidence payload completeness expected by the product flow.

## Consequences

- Backend image builds are larger because PyTorch, torchvision, timm, and the model artifact are runtime dependencies.
- First inference in a process pays model-load cost; later inferences reuse the cached model.
- Corrupt image files are rejected earlier than before, so tests and clients must use valid image bytes.
- Recommendation generation remains reachable in the current UI but is not part of this classifier runtime acceptance slice.

## Verification

- Backend tests include direct CPU checkpoint loading and confidence validation.
- Frontend adapter tests cover all per-label scores and highest-average default category selection.
- Deployment config validation must include `CLASSIFIER_MODEL_PATH` in production runtime env.
