from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.schemas.guest import GuestCreate, GuestRespond, GuestUpdate
from app.services import guest as guest_services

router = APIRouter()


@router.post(
    "/events/{event_id}/guest", response_model=GuestRespond, status_code=201
)
def create_guest(
    event_id: int,
    guest_data: GuestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guest = guest_services.create_guest(db, guest_data, event_id, current_user.id)

    if guest is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return guest


@router.get("/events/{event_id}/guest", response_model=list[GuestRespond])
def get_guests(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guests = guest_services.get_guests(db, event_id, current_user.id)

    if guests is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return guests


@router.get("/guests/code/{guest_code}", response_model=GuestRespond)
def get_guest_by_code(
    guest_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guest = guest_services.get_guest_by_code(db, guest_code, current_user.id)

    if guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")

    return guest


@router.post("/guests/code/{guest_code}/check_in", response_model=GuestRespond)
def check_in_guest(
    guest_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guest = guest_services.check_in_guest(db, guest_code, current_user.id)

    if guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")

    return guest


@router.put("/guests/{guest_id}", response_model=GuestRespond)
def update_guest(
    guest_id: int,
    guest_data: GuestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guest = guest_services.update_guest(db, guest_id, guest_data, current_user.id)

    if guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")

    return guest


@router.delete("/guests/{guest_id}")
def delete_guest(
    guest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guest = guest_services.delete_guest(db, guest_id, current_user.id)

    if guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")

    return {"message": "Guest deleted successfully"}
