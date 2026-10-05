from enum import Enum

from pydantic import BaseModel, ConfigDict


class RSVPStatus(str, Enum):
    attending = "attending"
    not_attending = "not_attending"
    maybe = "maybe"


class RSVPCreate(BaseModel):
    status: RSVPStatus


class RSVPResponse(BaseModel):
    id: int
    guest_id: int
    status: RSVPStatus

    model_config = ConfigDict(from_attributes=True)

class RSVPListResponse(BaseModel):
    id: int
    guest_id: int
    guest_name: str
    status: RSVPStatus

    model_config = ConfigDict(from_attributes=True)

class RSVPSummaryResponse(BaseModel):
    total_guests: int
    attending: int
    not_attending: int
    maybe: int
    no_response: int