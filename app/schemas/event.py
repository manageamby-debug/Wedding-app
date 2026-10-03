from datetime import date, time
from enum import Enum

from pydantic import BaseModel, ConfigDict


class EventStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventCreate(BaseModel):
    groom_name: str
    bride_name: str
    event_date: date
    event_time: time
    venue_name: str
    venue_address: str
    status: EventStatus = EventStatus.DRAFT


class EventUpdate(BaseModel):
    groom_name: str
    bride_name: str
    event_date: date
    event_time: time
    venue_name: str
    venue_address: str
    status: EventStatus


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
