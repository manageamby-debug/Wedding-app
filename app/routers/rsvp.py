from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import require_event_owner
from app.models.event import Event
from app.schemas.rsvp import (
    RSVPCreate,
    RSVPResponse,
    RSVPListResponse,
    RSVPSummaryResponse,
)
from app.services import rsvp as rsvp_service


router = APIRouter()


# =========================
# PUBLIC - Guest RSVP
# =========================

@router.post(
    "/rsvp/{short_code}",
    response_model=RSVPResponse
)
def create_or_update_rsvp(
    short_code: str,
    rsvp_data: RSVPCreate,
    db: Session = Depends(get_db)
):
    rsvp = rsvp_service.create_or_update_rsvp(
        db,
        short_code,
        rsvp_data
    )

    if rsvp is None:
        raise HTTPException(
            status_code=404,
            detail="Invitation not found"
        )

    return rsvp


@router.get(
    "/rsvp/{short_code}",
    response_model=RSVPResponse
)
def get_rsvp(
    short_code: str,
    db: Session = Depends(get_db)
):
    rsvp = rsvp_service.get_rsvp_by_short_code(
        db,
        short_code
    )

    if rsvp is None:
        raise HTTPException(
            status_code=404,
            detail="RSVP not found"
        )

    return rsvp


# =========================
# ORGANIZER ONLY
# =========================

@router.get(
    "/events/{event_id}/rsvps",
    response_model=list[RSVPListResponse]
)
def get_event_rsvps(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    return rsvp_service.get_event_rsvps(
        db,
        event.id,
        event.user_id,
    )


@router.get(
    "/events/{event_id}/rsvp-summary",
    response_model=RSVPSummaryResponse
)
def get_rsvp_summary(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    return rsvp_service.get_rsvp_summary(
        db,
        event.id,
        event.user_id,
    )
