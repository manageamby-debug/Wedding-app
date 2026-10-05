from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.contributions import Contribution
from app.models.event import Event
from app.models.guest import Guest
from app.models.user import User
from app.services.event_access import get_owned_event


def require_event_owner(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
) -> Event:
    event = get_owned_event(db, event_id, current_user.id)

    if event is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this event",
        )

    return event


def require_contribution_owner(
    contribution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
) -> Contribution:
    contribution = (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Contribution.id == contribution_id,
            Event.user_id == current_user.id,
        )
        .first()
    )

    if contribution is None:
        raise HTTPException(
            status_code=404,
            detail="Contribution not found",
        )

    return contribution


def require_guest_owner(
    guest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
) -> Guest:
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == guest_id,
            Event.user_id == current_user.id,
        )
        .first()
    )

    if guest is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found",
        )

    return guest
