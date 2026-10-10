from fastapi import Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.contributions import Contribution
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.guest import Guest
from app.models.user import User
from app.services.event_access import get_owned_event


def event_access_filter(user_id: int):
    member_events = select(EventMember.event_id).where(EventMember.user_id == user_id)
    return or_(Event.user_id == user_id, Event.id.in_(member_events))


def get_accessible_event(db: Session, event_id: int, user_id: int) -> Event | None:
    return db.query(Event).filter(Event.id == event_id, event_access_filter(user_id)).first()


def require_event_owner(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Event:
    event = get_accessible_event(db, event_id, current_user.id)

    if event is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this event",
        )

    return event


def require_event_manager(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
) -> Event:
    event = get_owned_event(db, event_id, current_user.id)
    if event is None:
        raise HTTPException(status_code=403, detail="Only the event chair can manage the committee")
    return event


def require_contribution_owner(
    contribution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Contribution:
    contribution = (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Contribution.id == contribution_id,
            event_access_filter(current_user.id),
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
    current_user: User = Depends(get_current_user),
) -> Guest:
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == guest_id,
            event_access_filter(current_user.id),
        )
        .first()
    )

    if guest is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found",
        )

    return guest
