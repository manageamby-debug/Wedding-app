from pydantic import BaseModel, EmailStr, Field


class EventMemberCreate(BaseModel):
    email: EmailStr
    position: str = Field(default="member", min_length=2, max_length=30)


class EventMemberResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: EmailStr
    position: str

    class Config:
        from_attributes = True
