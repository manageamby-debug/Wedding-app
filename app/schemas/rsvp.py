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