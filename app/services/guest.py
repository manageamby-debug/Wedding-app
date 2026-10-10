from app.core.event_access import event_access_filter
import secrets

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.guest import Guest
from app.schemas.guest import GuestCreate, GuestUpdate


def create_guest(
    db: Session,
    guest_data: GuestCreate,
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

    new_guest = Guest(
        event_id=event_id,
        full_name=guest_data.full_name,
        phone=guest_data.phone,
        email=guest_data.email,
        guest_code=f"GST-{secrets.token_hex(4).upper()}",
        check_in_status="pending",
    )
    db.add(new_guest)
    db.commit()
    db.refresh(new_guest)

    return new_guest


def get_guests(db: Session, event_id: int, user_id: int):
    """All guests of one of the user's events, or None if the event isn't theirs."""
    event = (
        db.query(Event)
        .filter(Event.id == event_id, event_access_filter(user_id))
        .first()
    )

    if event is None:
        return None

    return db.query(Guest).filter(Guest.event_id == event_id).all()


def get_guest_by_code(db: Session, guest_code: str, user_id: int):
    return (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(Guest.guest_code == guest_code, event_access_filter(user_id))
        .first()
    )


def check_in_guest(db: Session, guest_code: str, user_id: int):
    guest = get_guest_by_code(db, guest_code, user_id)

    if guest is None:
        return None

    guest.check_in_status = "checked_in"

    db.commit()
    db.refresh(guest)

    return guest


def update_guest(
    db: Session,
    guest_id: int,
    guest_data: GuestUpdate,
    user_id: int,
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(Guest.id == guest_id, event_access_filter(user_id))
        .first()
    )

    if guest is None:
        return None

    guest.full_name = guest_data.full_name
    guest.phone = guest_data.phone
    guest.email = guest_data.email

    db.commit()
    db.refresh(guest)

    return guest

def delete_guest(
    db: Session,
    guest_id: int,
    user_id: int,
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(Guest.id == guest_id, event_access_filter(user_id))
        .first()
    )

    if guest is None:
        return None

    db.delete(guest)
    db.commit()

    return guest