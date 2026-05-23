from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_store, require_user
from app.core.ids import new_id
from app.schemas.api import CollectionCreateRequest, CollectionRenameRequest
from app.services.display import (
    collection_card_display,
    collection_detail_display,
    find_collection_by_slug_or_id,
)

router = APIRouter()


async def get_owned_collection(collection_id: str, store, user):
    collection = await store.find_one("collections", id=collection_id)
    if not collection or collection["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@router.post("", status_code=201)
async def create_collection(
    payload: CollectionCreateRequest,
    store=Depends(get_store),
    user=Depends(require_user),
):
    collection = await store.save_doc(
        "collections",
        {
            "id": new_id("col"),
            "owner_id": user["id"],
            "name": payload.name.strip(),
            "description": "",
            "visibility": "private",
        },
    )
    return {"collection": await collection_card_display(store, collection)}


@router.get("")
async def list_collections(store=Depends(get_store), user=Depends(require_user)):
    collections = await store.list_docs("collections", owner_id=user["id"])
    return {"collections": [await collection_card_display(store, item) for item in collections]}


@router.get("/{slug_or_id}")
async def get_collection_detail(
    slug_or_id: str,
    store=Depends(get_store),
    user=Depends(require_user),
):
    collection = await find_collection_by_slug_or_id(store, user["id"], slug_or_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"collection": await collection_detail_display(store, collection, viewer_id=user["id"])}


@router.patch("/{collection_id}")
async def rename_collection(
    collection_id: str,
    payload: CollectionRenameRequest,
    store=Depends(get_store),
    user=Depends(require_user),
):
    await get_owned_collection(collection_id, store, user)
    collection = await store.update_doc("collections", collection_id, {"name": payload.name.strip()})
    return {"collection": collection}


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str, store=Depends(get_store), user=Depends(require_user)):
    await get_owned_collection(collection_id, store, user)
    items = await store.list_docs("collectionItems", collection_id=collection_id)
    for item in items:
        await store.delete_doc("collectionItems", item["id"])
    await store.delete_doc("collections", collection_id)
    return {"deleted": True}


@router.post("/{collection_id}/items/{trip_plan_id}")
async def save_trip_plan(
    collection_id: str,
    trip_plan_id: str,
    store=Depends(get_store),
    user=Depends(require_user),
):
    await get_owned_collection(collection_id, store, user)
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan or plan.get("status") != "accepted" or plan.get("visibility") != "public":
        raise HTTPException(status_code=404, detail="Public Trip Plan not found")
    existing = await store.find_one(
        "collectionItems", collection_id=collection_id, trip_plan_id=trip_plan_id
    )
    if existing:
        return {"saved": True, "item": existing}
    item = await store.save_doc(
        "collectionItems",
        {
            "id": new_id("coli"),
            "collection_id": collection_id,
            "owner_id": user["id"],
            "trip_plan_id": trip_plan_id,
        },
    )
    return {"saved": True, "item": item}


@router.delete("/{collection_id}/items/{trip_plan_id}")
async def remove_trip_plan(
    collection_id: str,
    trip_plan_id: str,
    store=Depends(get_store),
    user=Depends(require_user),
):
    await get_owned_collection(collection_id, store, user)
    existing = await store.find_one(
        "collectionItems", collection_id=collection_id, trip_plan_id=trip_plan_id
    )
    if existing:
        await store.delete_doc("collectionItems", existing["id"])
    return {"saved": False}
