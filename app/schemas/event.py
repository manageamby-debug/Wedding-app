from datetime import date, time
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EventStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


def _validate_couple_names(value: str) -> str:
    parts = value.split("&", maxsplit=1)
    if len(parts) != 2 or any(len(part.strip()) < 2 for part in parts):
        raise ValueError("Enter both couple names separated by '&'.")
    if any(len(part.strip()) > 100 for part in parts):
        raise ValueError("Each couple name must be at most 100 characters.")
    return " & ".join(part.strip() for part in parts)


def _validate_pair_fields(couple_names: str | None, groom_name: str | None, bride_name: str | None) -> None:
    if couple_names is not None:
        _validate_couple_names(couple_names)
        return
    if groom_name is None or bride_name is None:
        raise ValueError("Provide couple_names or both groom_name and bride_name.")


def _validate_venue_fields(venue: str | None, venue_name: str | None) -> None:
    if venue is None and venue_name is None:
        raise ValueError("Provide venue or venue_name.")


class EventCreate(BaseModel):
    # New API fields used by the mobile event form.
    name: str | None = Field(default=None, min_length=2, max_length=255)
    couple_names: str | None = Field(default=None, min_length=2, max_length=203)
    venue: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    target_contribution: Decimal = Field(
        default=Decimal("0"), ge=0, max_digits=14, decimal_places=2
    )

    # Legacy fields remain accepted so existing app clients keep working.
    groom_name: str | None = Field(default=None, min_length=2, max_length=100)
    bride_name: str | None = Field(default=None, min_length=2, max_length=100)
    venue_name: str | None = Field(default=None, min_length=2, max_length=255)
    venue_address: str | None = Field(default=None, max_length=255)

    event_date: date
    event_time: time
    status: EventStatus = EventStatus.DRAFT

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Event date cannot be in the past")
        return value

    @model_validator(mode="after")
    def validate_event_details(self):
        _validate_pair_fields(self.couple_names, self.groom_name, self.bride_name)
        _validate_venue_fields(self.venue, self.venue_name)
        return self


class EventUpdate(BaseModel):
    # New API fields are optional to support the existing full-replacement PUT form.
    name: str | None = Field(default=None, min_length=2, max_length=255)
    couple_names: str | None = Field(default=None, min_length=2, max_length=203)
    venue: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    target_contribution: Decimal | None = Field(
        default=None, ge=0, max_digits=14, decimal_places=2
    )

    # Legacy fields remain accepted for the existing edit screen.
    groom_name: str | None = Field(default=None, min_length=2, max_length=100)
    bride_name: str | None = Field(default=None, min_length=2, max_length=100)
    venue_name: str | None = Field(default=None, min_length=2, max_length=255)
    venue_address: str | None = Field(default=None, max_length=255)

    event_date: date
    event_time: time | None = None
    status: EventStatus | None = None

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Event date cannot be in the past")
        return value

    @model_validator(mode="after")
    def validate_event_details(self):
        _validate_pair_fields(self.couple_names, self.groom_name, self.bride_name)
        _validate_venue_fields(self.venue, self.venue_name)
        return self


class EventResponse(BaseModel):
    id: int
    user_id: int
    name: str
    couple_names: str
    groom_name: str
    bride_name: str
    event_date: date
    event_time: time
    venue: str
    venue_name: str
    venue_address: str
    description: str | None = None
    target_contribution: Decimal
    status: EventStatus

    model_config = ConfigDict(from_attributes=True)
