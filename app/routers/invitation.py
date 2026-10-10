from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import event_access_filter
from app.core.security import get_current_user
from app.models.event import Event
from app.models.guest import Guest
from app.models.user import User
from app.schemas.invitation import InvitationCreate, InvitationResponse
from app.services import invitation as invitation_service


router = APIRouter()


@router.post(
    "/invitations",
    response_model=InvitationResponse,
    status_code=201
)
def create_invitation(
    invitation_data: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == invitation_data.guest_id,
            event_access_filter(current_user.id),
        )
        .first()
    )

    if guest is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found",
        )

    invitation = invitation_service.create_invitation(
        db,
        invitation_data,
        current_user.id,
    )

    if invitation is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found"
        )

    return invitation

@router.get(
    "/invite/{short_code}",
    response_model=InvitationResponse
)
def get_public_invitation(
    short_code: str,
    db: Session = Depends(get_db)
):
    invitation = invitation_service.get_invitation_by_short_code(
        db,
        short_code
    )

    if invitation is None:
        raise HTTPException(
            status_code=404,
            detail="Invitation not found"
        )

    return invitation
