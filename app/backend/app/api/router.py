from fastapi import APIRouter

from app.api import (
    account,
    auth,
    categories,
    collections,
    explore,
    health,
    images,
    likes,
    recommendations,
    seeds,
    trip_creation,
    trip_plans,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(account.router, prefix="/account", tags=["account"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(explore.router, prefix="/explore", tags=["explore"])
api_router.include_router(trip_plans.router, prefix="/trip-plans", tags=["trip-plans"])
api_router.include_router(likes.router, prefix="/likes", tags=["likes"])
api_router.include_router(collections.router, prefix="/collections", tags=["collections"])
api_router.include_router(trip_creation.router, prefix="/trip-creation-sessions", tags=["trip-creation"])
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(seeds.router, prefix="/destination-seeds", tags=["destination-seeds"])
api_router.include_router(recommendations.router, tags=["recommendations"])
