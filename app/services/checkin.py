from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.guest import Guest
from app.models.invitation import Invitation
from app.models.rsvp import RSVP


def _get_guest(db: Session, event_id: int, guest_code: str, user_id: int):
    """Guest of one of the user's own events, or None.

    The code can be the guest's own code or the code of their invitation
    (the one inside the invitation's QR code).
    """
    return (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .outerjoin(Invitation, Invitation.guest_id == Guest.id)
        .filter(
            Guest.event_id == event_id,
            Event.user_id == user_id,
            or_(
                Guest.guest_code == guest_code,
                Invitation.invitation_code == guest_code,
            ),
        )
        .first()
    )


def check_in_guest(
    db: Session, event_id: int, guest_code: str, user_id: int
) -> tuple[Guest | None, str]:
    """Returns (guest, status): not_found, already_checked_in or checked_in."""
    guest = _get_guest(db, event_id, guest_code, user_id)

    if guest is None:
        return None, "not_found"

    if guest.check_in_status == "checked_in":
        return guest, "already_checked_in"

    guest.check_in_status = "checked_in"
    guest.checked_in_at = datetime.utcnow()

    db.commit()
    db.refresh(guest)

    return guest, "checked_in"


def get_guest_for_check_in(
    db: Session, event_id: int, guest_code: str, user_id: int
):
    guest = _get_guest(db, event_id, guest_code, user_id)

    if guest is None:
        return None

    return {
        "guest_id": guest.id,
        "guest_name": guest.full_name,
        "guest_code": guest.guest_code,
        "phone": guest.phone,
        "email": guest.email,
        "check_in_status": guest.check_in_status,
        "checked_in_at": guest.checked_in_at,
    }


def get_check_in_summary(db: Session, event_id: int, user_id: int):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == user_id)
        .first()
    )

    if event is None:
        return None

    total_guests = db.query(Guest).filter(Guest.event_id == event_id).count()

    checked_in = (
        db.query(Guest)
        .filter(
            Guest.event_id == event_id,
            Guest.check_in_status == "checked_in",
        )
        .count()
    )

    percentage = round(checked_in / total_guests * 100, 2) if total_guests else 0.0

    return {
        "total_guests": total_guests,
        "checked_in": checked_in,
        "not_checked_in": total_guests - checked_in,
        "check_in_percentage": percentage,
    }


def get_checked_in_guests(
    db: Session, event_id: int, user_id: int
) -> list[dict] | None:
    """Checked-in guests of the user's own event, earliest first.

    Returns None when the event does not exist or is not the user's.
    """
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == user_id)
        .first()
    )

    if event is None:
        return None

    guests = (
        db.query(Guest)
        .filter(
            Guest.event_id == event_id,
            Guest.check_in_status == "checked_in",
        )
        .order_by(Guest.checked_in_at.asc())
        .all()
    )

    return [
        {
            "guest_id": guest.id,
            "guest_name": guest.full_name,
            "guest_code": guest.guest_code,
            "check_in_status": guest.check_in_status,
            "checked_in_at": guest.checked_in_at,
        }
        for guest in guests
    ]


def get_guest_check_in_status(
    db: Session, event_id: int, user_id: int
) -> list[dict] | None:
    """Return all guests and RSVP/check-in status for the user's event.

    Returns None when the event does not exist or is not owned by the user.
    """
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == user_id)
        .first()
    )

    if event is None:
        return None

    results = (
        db.query(Guest, RSVP)
        .outerjoin(RSVP, RSVP.guest_id == Guest.id)
        .filter(Guest.event_id == event_id)
        .order_by(Guest.full_name.asc())
        .all()
    )

    return [
        {
            "guest_id": guest.id,
            "guest_name": guest.full_name,
            "guest_code": guest.guest_code,
            "rsvp_status": rsvp.status if rsvp else None,
            "check_in_status": guest.check_in_status,
            "checked_in_at": guest.checked_in_at,
        }
        for guest, rsvp in results
    ]
