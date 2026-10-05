from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import require_event_owner
from app.models.event import Event
from app.schemas.checkin import (
    CheckedInGuestResponse,
    CheckInGuestResponse,
    CheckInResponse,
    CheckInSummaryResponse,
    GuestCheckInStatusResponse,
)
from app.services import checkin as checkin_service


router = APIRouter()


@router.post(
    "/events/{event_id}/check-in/{guest_code}",
    response_model=CheckInResponse
)
def check_in_guest(
    guest_code: str,
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    guest, status = checkin_service.check_in_guest(
        db,
        event.id,
        guest_code,
        event.user_id
    )

    if status == "not_found" or guest is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found"
        )

    if status == "already_checked_in":
        raise HTTPException(
            status_code=409,
            detail="Guest already checked in"
        )

    return {
        "message": "Guest checked in successfully",
        "guest_id": guest.id,
        "guest_name": guest.full_name,
        "guest_code": guest.guest_code,
        "check_in_status": guest.check_in_status,
        "checked_in_at": guest.checked_in_at
    }


@router.get(
    "/events/{event_id}/check-in/{guest_code}",
    response_model=CheckInGuestResponse
)
def get_guest_for_check_in(
    guest_code: str,
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    guest = checkin_service.get_guest_for_check_in(
        db,
        event.id,
        guest_code,
        event.user_id
    )

    if guest is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found"
        )

    return guest


@router.get(
    "/events/{event_id}/check-in-summary",
    response_model=CheckInSummaryResponse
)
def get_check_in_summary(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    summary = checkin_service.get_check_in_summary(
        db,
        event.id,
        event.user_id
    )

    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return summary


@router.get(
    "/events/{event_id}/checked-in-guests",
    response_model=list[CheckedInGuestResponse]
)
def get_checked_in_guests(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    guests = checkin_service.get_checked_in_guests(
        db,
        event.id,
        event.user_id
    )

    if guests is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return guests


@router.get(
    "/events/{event_id}/guests/check-in-status",
    response_model=list[GuestCheckInStatusResponse]
)
def get_guest_check_in_status(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    guests = checkin_service.get_guest_check_in_status(
        db,
        event.id,
        event.user_id
    )

    if guests is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return guests
