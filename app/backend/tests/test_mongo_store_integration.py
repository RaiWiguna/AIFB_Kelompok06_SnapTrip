import os
import subprocess

import pytest

from app.core.config import Settings
from app.db.store import MongoStore


def docker_available() -> bool:
    result = subprocess.run(
        ["docker", "info", "--format", "{{.ServerVersion}}"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


@pytest.mark.asyncio
async def test_mongo_store_gridfs_and_recommendation_persistence_with_testcontainer():
    if not docker_available():
        pytest.skip("Docker is not available for MongoDB testcontainers")
    if os.environ.get("SNAPTRIP_RUN_TESTCONTAINERS") != "1":
        pytest.skip("Set SNAPTRIP_RUN_TESTCONTAINERS=1 to run MongoDB testcontainers")

    from testcontainers.mongodb import MongoDbContainer

    with MongoDbContainer("mongo:7") as mongo:
        settings = Settings(
            mongodb_uri=mongo.get_connection_url(),
            mongodb_database="snaptrip_test",
            gridfs_bucket="snaptrip_images",
            session_secret="test-session-secret",
        )
        store = MongoStore(settings)
        await store.connect()
        try:
            await store.ensure_indexes()
            await store.seed_destinations()

            image = await store.save_image(
                "usr_test",
                FakeUploadFile("snap.jpg", "image/jpeg"),
                b"fake-image-bytes",
            )
            assert image["gridfs_id"] != image["id"]
            assert await store.get_image_bytes(image["id"]) == b"fake-image-bytes"

            enrichment = await store.save_doc(
                "placeEnrichments",
                {
                    "id": "plc_test",
                    "seed_id": "dest_kuta_beach",
                    "provider": "google_places",
                    "display_name": "Pantai Kuta",
                },
            )
            run = await store.save_doc(
                "recommendationRuns",
                {
                    "id": "rec_test",
                    "session_id": "tcs_test",
                    "owner_id": "usr_test",
                    "schema_version": "destination_recommendation.v1",
                },
            )
            item = await store.save_doc(
                "recommendationItems",
                {
                    "id": "reci_test",
                    "run_id": run["id"],
                    "session_id": "tcs_test",
                    "owner_id": "usr_test",
                    "rank": 1,
                },
            )

            assert enrichment["id"] == "plc_test"
            assert item["run_id"] == "rec_test"
            assert "session_id_1_owner_id_1" in await store.db.recommendationRuns.index_information()
            observability_indexes = await store.db.aiObservabilityEvents.index_information()
            assert "expires_at_1" in observability_indexes
            assert observability_indexes["expires_at_1"].get("expireAfterSeconds") == 0
        finally:
            await store.close()


class FakeUploadFile:
    def __init__(self, filename: str, content_type: str):
        self.filename = filename
        self.content_type = content_type
