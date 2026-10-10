from app.core.event_access import event_access_filter
from sqlalchemy.orm import Session

from app.models.guest import Guest
from app.models.rsvp import RSVP
from app.models.event import Event
from app.schemas.rsvp import RSVPCreate
from app.services import invitation as invitation_service


def create_or_update_rsvp(
    db: Session,
    short_code: str,
    rsvp_data: RSVPCreate,
):
    invitation = invitation_service.get_invitation_by_short_code(
        db, short_code
    )

    if invitation is None:
        return None

    guest_id = invitation["guest_id"]

    existing_rsvp = db.query(RSVP).filter(RSVP.guest_id == guest_id).first()

    if existing_rsvp is not None:
        existing_rsvp.status = rsvp_data.status.value

        db.commit()
        db.refresh(existing_rsvp)

        return existing_rsvp

    new_rsvp = RSVP(guest_id=guest_id, status=rsvp_data.status.value)

    db.add(new_rsvp)
    db.commit()
    db.refresh(new_rsvp)

    return new_rsvp


def get_rsvp_by_short_code(db: Session, short_code: str):
    invitation = invitation_service.get_invitation_by_short_code(
        db, short_code
    )

    if invitation is None:
        return None

    return (
        db.query(RSVP)
        .filter(RSVP.guest_id == invitation["guest_id"])
        .first()
    )

def get_event_rsvps(
    db: Session,
    event_id: int,
    user_id: int,
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, event_access_filter(user_id))
        .first()
    )

    if event is None:
        return None

    results = (
        db.query(RSVP, Guest.full_name)
        .join(Guest, RSVP.guest_id == Guest.id)
        .filter(Guest.event_id == event_id)
        .all()
    )

    return [
        {
            "id": rsvp.id,
            "guest_id": rsvp.guest_id,
            "guest_name": guest_name,
            "status": rsvp.status
        }
        for rsvp, guest_name in results
    ]

def get_rsvp_summary(
    db: Session,
    event_id: int,
    user_id: int,
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, event_access_filter(user_id))
        .first()
    )

    if event is None:
        return None

    total_guests = (
        db.query(Guest)
        .filter(Guest.event_id == event_id)
        .count()
    )

    attending = (
        db.query(RSVP)
        .join(Guest, RSVP.guest_id == Guest.id)
        .filter(
            Guest.event_id == event_id,
            RSVP.status == "attending"
        )
        .count()
    )

    not_attending = (
        db.query(RSVP)
        .join(Guest, RSVP.guest_id == Guest.id)
        .filter(
            Guest.event_id == event_id,
            RSVP.status == "not_attending"
        )
        .count()
    )

    maybe = (
        db.query(RSVP)
        .join(Guest, RSVP.guest_id == Guest.id)
        .filter(
            Guest.event_id == event_id,
            RSVP.status == "maybe"
        )
        .count()
    )

    no_response = total_guests - (
        attending + not_attending + maybe
    )

    return {
        "total_guests": total_guests,
        "attending": attending,
        "not_attending": not_attending,
        "maybe": maybe,
        "no_response": no_response
    }
