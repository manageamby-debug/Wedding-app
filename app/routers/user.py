from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse , UserLogin
from app.services import user as user_service
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create_user(db, user_data)

@router.post("/users/login")
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    return user_service.login_user(db, user_data)

@router.get("/users/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user