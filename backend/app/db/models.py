from datetime import datetime
from typing import Any

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel

from backend.app.core.ids import prefixed_id
from backend.app.core.time import now_jakarta


class TravelSession(SQLModel, table=True):
    __tablename__ = "sessions"

    id: str = Field(default_factory=lambda: prefixed_id("sess"), primary_key=True)
    created_at: datetime = Field(default_factory=now_jakarta, nullable=False)
    updated_at: datetime = Field(default_factory=now_jakarta, nullable=False)
    status: str = Field(default="active", index=True)


class Destination(SQLModel, table=True):
    __tablename__ = "destinations"

    id: str = Field(primary_key=True)
    name: str
    city: str = Field(index=True)
    description: str
    address: str
    latitude: float
    longitude: float
    rating: float
    review_count: int
    estimated_price: int
    average_visit_duration_minutes: int
    maps_place_id: str | None = None
    categories: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    image_urls: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    opening_hours: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=now_jakarta, nullable=False)


class Feedback(SQLModel, table=True):
    __tablename__ = "feedback"

    id: str = Field(default_factory=lambda: prefixed_id("fb"), primary_key=True)
    session_id: str = Field(foreign_key="sessions.id", index=True)
    destination_id: str = Field(foreign_key="destinations.id", index=True)
    action: str
    created_at: datetime = Field(default_factory=now_jakarta, nullable=False)


class Itinerary(SQLModel, table=True):
    __tablename__ = "itineraries"

    id: str = Field(default_factory=lambda: prefixed_id("itin"), primary_key=True)
    session_id: str = Field(foreign_key="sessions.id", index=True)
    title: str
    summary: str
    constraints: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    estimated_total_budget: int = 0
    notes: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = Field(default="draft", index=True)
    created_at: datetime = Field(default_factory=now_jakarta, nullable=False)
    updated_at: datetime = Field(default_factory=now_jakarta, nullable=False)
