from pydantic import BaseModel, EmailStr , Field
from enum import Enum


class UserRole(str,Enum):
    ORGANIZER = "organizer"
    STAFF = "staff"

class UserCreate(BaseModel):
    full_name: str = Field(min_length=3 , max_length=128)
    email: EmailStr
    password: str = Field(min_length=8 , max_length=128)
    


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str
