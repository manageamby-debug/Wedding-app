from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict


class InvitationCreate(BaseModel):
    guest_id: int


class InvitationResponse(BaseModel):
    id: int
    guest_id: int
    guest_name: str

    groom_name: str
    bride_name: str

    event_date: date
    event_time: time
    venue_name: str
    venue_address: str

    invitation_code: str
    short_code: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)