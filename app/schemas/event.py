from datetime import date, time
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EventStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventCreate(BaseModel):
    groom_name: str = Field(min_length=2, max_length=100)
    bride_name: str = Field(min_length=2, max_length=100)
    event_date: date
    event_time: time
    venue_name: str = Field(min_length=2, max_length=150)
    venue_address: str = Field(min_length=2, max_length=255)
    status: EventStatus = EventStatus.DRAFT

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Event date cannot be in the past")
        return value


class EventUpdate(BaseModel):
    groom_name: str
    bride_name: str
    event_date: date
    event_time: time
    venue_name: str
    venue_address: str
    status: EventStatus

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Event date cannot be in the past")
        return value


class EventResponse(BaseModel):
    id: int
    groom_name: str
    bride_name: str
    event_date: date
    event_time: time
    venue_name: str
    venue_address: str
    status: EventStatus

    model_config = ConfigDict(from_attributes=True)
