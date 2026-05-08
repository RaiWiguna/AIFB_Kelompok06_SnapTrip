from __future__ import annotations

import copy
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pymongo import ASCENDING

from app.core.config import Settings
from app.core.ids import new_id
from app.core.security import sha256_bytes
from app.db.seeds import DESTINATION_SEEDS


def now() -> datetime:
    return datetime.now(UTC)


def public_doc(doc: dict[str, Any]) -> dict[str, Any]:
    cleaned = copy.deepcopy(doc)
    cleaned.pop("_id", None)
    return cleaned


class BaseStore:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def connect(self) -> None: ...
    async def close(self) -> None: ...
    async def ensure_indexes(self) -> None: ...
    async def ready(self) -> dict[str, Any]: ...
    async def seed_destinations(self) -> None: ...


class MemoryStore(BaseStore):
    def __init__(self, settings: Settings):
        super().__init__(settings)
        self.collections: dict[str, dict[str, dict[str, Any]]] = {
            name: {}
            for name in (
                "users",
                "sessions",
                "tripPlans",
                "likes",
                "collections",
                "collectionItems",
                "uploadedImages",
                "tripCreationSessions",
                "classificationResults",
                "destinationSeeds",
                "placeEnrichments",
                "recommendationRuns",
                "recommendationItems",
            )
        }
        self.gridfs: dict[str, bytes] = {}

    async def connect(self) -> None:
        return None

    async def close(self) -> None:
        return None

    async def ensure_indexes(self) -> None:
        return None

    async def ready(self) -> dict[str, Any]:
        return {"ready": True, "dependencies": {"mongo": "memory", "gridfs": "memory"}}

    async def seed_destinations(self) -> None:
        for seed in DESTINATION_SEEDS:
            self.collections["destinationSeeds"][seed["id"]] = copy.deepcopy(seed)

    def _insert(self, collection: str, doc: dict[str, Any]) -> dict[str, Any]:
        self.collections[collection][doc["id"]] = copy.deepcopy(doc)
        return public_doc(doc)

    async def find_one(self, collection: str, **criteria) -> dict[str, Any] | None:
        for doc in self.collections[collection].values():
            if all(doc.get(key) == value for key, value in criteria.items()):
                return public_doc(doc)
        return None

    async def list_docs(self, collection: str, **criteria) -> list[dict[str, Any]]:
        docs = []
        for doc in self.collections[collection].values():
            if all(doc.get(key) == value for key, value in criteria.items()):
                docs.append(public_doc(doc))
        return docs

    async def save_doc(self, collection: str, doc: dict[str, Any]) -> dict[str, Any]:
        doc = copy.deepcopy(doc)
        doc.setdefault("created_at", now())
        doc["updated_at"] = now()
        return self._insert(collection, doc)

    async def update_doc(self, collection: str, doc_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        doc = self.collections[collection].get(doc_id)
        if not doc:
            return None
        doc.update(copy.deepcopy(updates))
        doc["updated_at"] = now()
        return public_doc(doc)

    async def delete_doc(self, collection: str, doc_id: str) -> bool:
        return self.collections[collection].pop(doc_id, None) is not None

    async def save_image(self, owner_id: str, file: UploadFile, data: bytes) -> dict[str, Any]:
        image_id = new_id("img")
        metadata = {
            "id": image_id,
            "owner_id": owner_id,
            "filename": file.filename or image_id,
            "content_type": file.content_type,
            "size_bytes": len(data),
            "checksum_sha256": sha256_bytes(data),
            "gridfs_id": image_id,
            "created_at": now(),
            "updated_at": now(),
        }
        self.gridfs[image_id] = data
        self.collections["uploadedImages"][image_id] = metadata
        return public_doc(metadata)

    async def get_image_bytes(self, image_id: str) -> bytes | None:
        image = self.collections["uploadedImages"].get(image_id)
        if not image:
            return None
        return self.gridfs.get(image["gridfs_id"])


class MongoStore(BaseStore):
    def __init__(self, settings: Settings):
        super().__init__(settings)
        self.client: AsyncIOMotorClient | None = None
        self.db = None

    async def connect(self) -> None:
        self.client = AsyncIOMotorClient(self.settings.mongodb_uri)
        self.db = self.client[self.settings.mongodb_database]

    async def close(self) -> None:
        if self.client:
            self.client.close()

    async def ensure_indexes(self) -> None:
        assert self.db is not None
        await self.db.users.create_index([("email", ASCENDING)], unique=True)
        await self.db.sessions.create_index([("token_hash", ASCENDING)], unique=True)
        await self.db.likes.create_index([("user_id", ASCENDING), ("trip_plan_id", ASCENDING)], unique=True)
        await self.db.collectionItems.create_index(
            [("collection_id", ASCENDING), ("trip_plan_id", ASCENDING)], unique=True
        )
        await self.db.destinationSeeds.create_index([("categories", ASCENDING)])
        await self.db.placeEnrichments.create_index([("seed_id", ASCENDING)])
        await self.db.placeEnrichments.create_index([("expires_at", ASCENDING)])
        await self.db.recommendationRuns.create_index([("session_id", ASCENDING), ("owner_id", ASCENDING)])
        await self.db.recommendationItems.create_index([("run_id", ASCENDING), ("rank", ASCENDING)])
        await self.db.recommendationItems.create_index([("session_id", ASCENDING), ("owner_id", ASCENDING)])

    async def ready(self) -> dict[str, Any]:
        try:
            assert self.client is not None and self.db is not None
            await self.client.admin.command("ping")
            await self.db.command("ping")
            return {"ready": True, "dependencies": {"mongo": "ok", "gridfs": "ok"}}
        except Exception as exc:
            return {"ready": False, "reason": f"MongoDB/GridFS unavailable: {exc}"}

    async def seed_destinations(self) -> None:
        assert self.db is not None
        for seed in DESTINATION_SEEDS:
            await self.db.destinationSeeds.update_one({"id": seed["id"]}, {"$set": seed}, upsert=True)

    async def find_one(self, collection: str, **criteria) -> dict[str, Any] | None:
        assert self.db is not None
        doc = await self.db[collection].find_one(criteria)
        return public_doc(doc) if doc else None

    async def list_docs(self, collection: str, **criteria) -> list[dict[str, Any]]:
        assert self.db is not None
        cursor = self.db[collection].find(criteria)
        return [public_doc(doc) async for doc in cursor]

    async def save_doc(self, collection: str, doc: dict[str, Any]) -> dict[str, Any]:
        assert self.db is not None
        doc = copy.deepcopy(doc)
        doc.setdefault("created_at", now())
        doc["updated_at"] = now()
        await self.db[collection].update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
        return public_doc(doc)

    async def update_doc(self, collection: str, doc_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        assert self.db is not None
        updates = copy.deepcopy(updates)
        updates["updated_at"] = now()
        await self.db[collection].update_one({"id": doc_id}, {"$set": updates})
        return await self.find_one(collection, id=doc_id)

    async def delete_doc(self, collection: str, doc_id: str) -> bool:
        assert self.db is not None
        result = await self.db[collection].delete_one({"id": doc_id})
        return result.deleted_count > 0

    async def save_image(self, owner_id: str, file: UploadFile, data: bytes) -> dict[str, Any]:
        assert self.db is not None
        image_id = new_id("img")
        bucket = AsyncIOMotorGridFSBucket(self.db, bucket_name=self.settings.gridfs_bucket)
        gridfs_id = await bucket.upload_from_stream(
            file.filename or image_id,
            data,
            metadata={
                "snaptrip_image_id": image_id,
                "owner_id": owner_id,
                "content_type": file.content_type,
                "checksum_sha256": sha256_bytes(data),
            },
        )
        metadata = {
            "id": image_id,
            "owner_id": owner_id,
            "filename": file.filename or image_id,
            "content_type": file.content_type,
            "size_bytes": len(data),
            "checksum_sha256": sha256_bytes(data),
            "gridfs_id": str(gridfs_id),
            "created_at": now(),
            "updated_at": now(),
        }
        await self.save_doc("uploadedImages", metadata)
        return public_doc(metadata)

    async def get_image_bytes(self, image_id: str) -> bytes | None:
        assert self.db is not None
        image = await self.find_one("uploadedImages", id=image_id)
        if not image:
            return None
        bucket = AsyncIOMotorGridFSBucket(self.db, bucket_name=self.settings.gridfs_bucket)
        gridfs_id = image["gridfs_id"]
        try:
            object_id = ObjectId(gridfs_id)
        except Exception:
            return None
        stream = await bucket.open_download_stream(object_id)
        return await stream.read()


def create_store(settings: Settings) -> MemoryStore | MongoStore:
    if settings.storage_backend == "memory" or settings.mongodb_uri == "memory://snaptrip":
        return MemoryStore(settings)
    return MongoStore(settings)
