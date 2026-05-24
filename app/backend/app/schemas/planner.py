from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

DocumentType = Literal["trip_memo", "full_itinerary", "budget_plan"]
PlannerStatus = Literal["idle", "working", "needs_input", "ready_to_review", "interrupted", "accepted"]
Visibility = Literal["private", "invite_only", "public"]
BudgetMode = Literal["estimated", "fixed_total", "max_total", "fixed_per_person", "max_per_person", "daily_cap"]
PlannerIntent = Literal[
    "initial_plan",
    "answer_question",
    "recommend_destinations",
    "change_duration",
    "change_budget",
    "add_destination",
    "change_preferences",
    "request_clarification",
    "unsupported",
]


class PlannerStartRequest(BaseModel):
    recommendation_item_id: str = Field(min_length=1)
    travel_start_date: date
    travel_end_date: date
    traveler_count: int = Field(ge=1, le=20)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.travel_end_date < self.travel_start_date:
            raise ValueError("travel_end_date must be on or after travel_start_date")
        return self

    @property
    def duration_days(self) -> int:
        return (self.travel_end_date - self.travel_start_date).days + 1


class PlannerMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

    @field_validator("text")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class PlannerAcceptRequest(BaseModel):
    visibility: Visibility = "private"


class PlannerInviteCreateRequest(BaseModel):
    expires_days: int = Field(default=14, ge=1, le=90)


class MemoTile(BaseModel):
    src: str
    alt: str


class TripMemoDocumentV1(BaseModel):
    schema_version: Literal["trip_memo.v1"] = "trip_memo.v1"
    markdown: str = Field(min_length=1)
    caption: str = Field(min_length=1)
    source: str = Field(min_length=1)
    items: int = Field(ge=1)
    tiles: list[MemoTile] = Field(min_length=1)


class ItineraryActivity(BaseModel):
    time: str = Field(min_length=1)
    title: str = Field(min_length=1)
    detail: str = Field(min_length=1)
    location: str | None = None
    duration: str | None = None


class ItineraryTransport(BaseModel):
    mode: str = Field(min_length=1)
    from_: str = Field(alias="from", min_length=1)
    to: str = Field(min_length=1)
    durationLabel: str = Field(min_length=1)


class ItineraryAccommodation(BaseModel):
    name: str = Field(min_length=1)
    area: str = Field(min_length=1)
    nights: int = Field(ge=0)


class ItineraryDay(BaseModel):
    day: int = Field(ge=1)
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    description: str = Field(min_length=1)
    cover: str = Field(min_length=1)
    dateLabel: str = Field(min_length=1)
    highlights: list[str] = Field(min_length=1)
    activities: list[ItineraryActivity] = Field(min_length=1)
    transport: ItineraryTransport
    accommodation: ItineraryAccommodation
    meals: dict[str, str] = Field(default_factory=dict)
    estCost: dict[str, str] = Field(default_factory=dict)


class FullItineraryDocumentV1(BaseModel):
    schema_version: Literal["full_itinerary.v1"] = "full_itinerary.v1"
    days: list[ItineraryDay] = Field(min_length=1)


class BudgetLineItem(BaseModel):
    label: str = Field(min_length=1)
    amount: str = Field(min_length=1)
    detail: str | None = None


class BudgetCategory(BaseModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    amount: str = Field(min_length=1)
    note: str = Field(min_length=1)
    items: list[BudgetLineItem] = Field(min_length=1)


class BudgetDailyRow(BaseModel):
    day: int = Field(ge=1)
    title: str = Field(min_length=1)
    route: str = Field(min_length=1)
    amounts: dict[str, int]


class BudgetConstraint(BaseModel):
    budget_mode: BudgetMode
    amount_idr: int = Field(ge=0)
    traveler_count: int = Field(ge=1, le=20)
    strict: bool = True
    source_text: str = Field(min_length=1)


class BudgetPlanDocumentV1(BaseModel):
    schema_version: Literal["budget_plan.v1"] = "budget_plan.v1"
    categories: list[BudgetCategory] = Field(min_length=1)
    daily: list[BudgetDailyRow] = Field(min_length=1)
    total_amount: str = Field(min_length=1)
    total_label: str = Field(min_length=1)
    estimated_total_idr: int | None = Field(default=None, ge=0)
    per_person_idr: int | None = Field(default=None, ge=0)
    budget_constraint: BudgetConstraint | None = None


class PlannerAgentAction(BaseModel):
    tool: str
    args: dict = Field(default_factory=dict)


class PlannerAgentStepV1(BaseModel):
    schema_version: Literal["planner_agent_step.v1"] = "planner_agent_step.v1"
    intent: PlannerIntent = "answer_question"
    assistant_text: str | None = None
    actions: list[PlannerAgentAction] = Field(default_factory=list)
    requires_document_edit: bool = False
    affected_documents: list[DocumentType] = Field(default_factory=list)
    duration_days: int | None = Field(default=None, ge=1, le=90)
    stop: bool = False
    needs_user_input: bool = False
