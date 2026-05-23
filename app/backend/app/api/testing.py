import base64
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_settings_from_app, get_store
from app.core.categories import CANONICAL_CATEGORIES
from app.core.security import hash_password, sha256_bytes
from app.db.seeds import DESTINATION_SEEDS

router = APIRouter()

PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l4m2"
    "NwAAAABJRU5ErkJggg=="
)


@router.post("/reset-product-journeys")
async def reset_product_journeys(store=Depends(get_store), settings=Depends(get_settings_from_app)):
    if settings.app_env != "test":
        raise HTTPException(status_code=404, detail="Testing routes are unavailable")
    if not hasattr(store, "collections") or not hasattr(store, "gridfs"):
        raise HTTPException(status_code=409, detail="Integrated journey seeding requires memory storage")

    for name in store.collections:
        store.collections[name].clear()
    store.gridfs.clear()
    await store.seed_destinations()

    created_at = datetime.now(UTC)
    user = await store.save_doc(
        "users",
        {
            "id": "usr_e2e_owner",
            "email": "seed-owner@example.com",
            "display_name": "Seed Owner",
            "password_hash": hash_password("password123"),
        },
    )

    seeds_by_category = []
    for category_item in CANONICAL_CATEGORIES:
        category = category_item["id"]
        seed = next(item for item in DESTINATION_SEEDS if category in item["categories"])
        seeds_by_category.append(seed)

    trips_by_category: dict[str, str] = {}
    for index, seed in enumerate(seeds_by_category, start=1):
        category = seed["categories"][0]
        image_id = f"img_e2e_{category}"
        store.gridfs[image_id] = PNG_BYTES
        await store.save_doc(
            "uploadedImages",
            {
                "id": image_id,
                "owner_id": user["id"],
                "filename": f"{category}.png",
                "content_type": "image/png",
                "size_bytes": len(PNG_BYTES),
                "checksum_sha256": sha256_bytes(PNG_BYTES),
                "gridfs_id": image_id,
            },
        )
        plan = await store.save_doc(
            "tripPlans",
            {
                "id": f"trip_e2e_{category}",
                "owner_id": user["id"],
                "title": f"{seed['name']} Journey",
                "status": "accepted",
                "visibility": "public",
                "categories": [category],
                "duration_days": index + 1,
                "estimated_budget_idr": seed["estimated_cost_idr"] * 3,
                "cover_image_id": image_id,
                "region": seed["region"],
                "editor_pick": index == 1,
                "created_at": created_at,
            },
        )
        trips_by_category[category] = plan["id"]

    private_plan = await store.save_doc(
        "tripPlans",
        {
            "id": "trip_e2e_private",
            "owner_id": user["id"],
            "title": "Private Control Journey",
            "status": "accepted",
            "visibility": "private",
            "categories": ["pantai"],
            "duration_days": 2,
            "estimated_budget_idr": 900000,
            "cover_image_id": None,
            "region": "Bali",
        },
    )

    return {
        "seeded": True,
        "users": {"owner": user["id"]},
        "trips_by_category": trips_by_category,
        "private_trip_id": private_plan["id"],
    }
