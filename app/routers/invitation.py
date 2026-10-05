from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
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
    current_user=Depends(require_role("organizer"))
):
    invitation = invitation_service.create_invitation(
        db,
        invitation_data,
        current_user.id
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