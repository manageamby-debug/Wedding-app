from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CheckInResponse(BaseModel):
    message: str
    guest_id: int
    guest_name: str
    guest_code: str
    check_in_status: str
    checked_in_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

class CheckInGuestResponse(BaseModel):
    guest_id: int
    guest_name: str
    guest_code: str
    phone: str | None
    email: str | None
    check_in_status: str
    checked_in_at: datetime | None = None

class CheckInSummaryResponse(BaseModel):
    total_guests: int
    checked_in: int
    not_checked_in: int
    check_in_percentage: float


class CheckedInGuestResponse(BaseModel):
    guest_id: int
    guest_name: str
    guest_code: str
    check_in_status: str
    checked_in_at: datetime | None


class GuestCheckInStatusResponse(BaseModel):
    guest_id: int
    guest_name: str
    guest_code: str
    rsvp_status: str | None
    check_in_status: str
    checked_in_at: datetime | None
