from pydantic import BaseModel, ConfigDict, Field


class GuestCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str | None = None
    email: str | None = None

class GuestUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str | None = None
    email: str | None = None



class GuestRespond(BaseModel):
    id: int
    event_id: int
    full_name: str
    guest_code: str
    check_in_status: str
    phone: str | None = None
    email: str | None = None

    model_config = ConfigDict(from_attributes=True)
