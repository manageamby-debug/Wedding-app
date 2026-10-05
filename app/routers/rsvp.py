from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.rsvp import RSVPCreate, RSVPResponse
from app.services import rsvp as rsvp_service


router = APIRouter()


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