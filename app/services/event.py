from sqlalchemy.orm import Session

from app.core.event_access import event_access_filter
from app.models.event import Event
from app.schemas.event import EventCreate, EventType, EventUpdate


def _default_event_name(event_type: str, host_names: str) -> str:
    if event_type == EventType.BIRTHDAY.value:
        return f"{host_names}'s Birthday"
    if event_type == EventType.GRADUATION.value:
        return f"{host_names}'s Graduation"
    return f"{host_names} Wedding"


def _event_people(
    event_data: EventCreate | EventUpdate, event_type: str
) -> tuple[str, str, str]:
    """Return (groom_name, bride_name, couple_names) for the event type.

    Weddings keep the "A & B" pair. Birthdays and graduations have a single
    celebrant, stored in groom_name / couple_names with bride_name left empty
    so the existing columns and clients keep working.
    """
    if event_type != EventType.WEDDING.value:
        host = (event_data.couple_names or event_data.groom_name or "").strip()
        return host, "", host

    if event_data.couple_names is not None:
        groom_name, bride_name = (
            part.strip() for part in event_data.couple_names.split("&", maxsplit=1)
        )
        return groom_name, bride_name, f"{groom_name} & {bride_name}"

    groom_name = (event_data.groom_name or "").strip()
    bride_name = (event_data.bride_name or "").strip()
    return groom_name, bride_name, f"{groom_name} & {bride_name}"


def _event_venue(event_data: EventCreate | EventUpdate) -> str:
    return (event_data.venue or event_data.venue_name or "").strip()


def create_event(db: Session, event_data: EventCreate, user_id: int):
    event_type = event_data.event_type.value
    groom_name, bride_name, couple_names = _event_people(event_data, event_type)
    venue = _event_venue(event_data)
    new_event = Event(
        event_type=event_type,
        name=(event_data.name or _default_event_name(event_type, couple_names)).strip(),
        couple_names=couple_names,
        groom_name=groom_name,
        bride_name=bride_name,
        event_date=event_data.event_date,
        event_time=event_data.event_time,
        venue_name=venue,
        venue_address=(event_data.venue_address or "").strip(),
        status=event_data.status.value,
        description=(event_data.description or "").strip() or None,
        target_contribution=event_data.target_contribution,
        user_id=user_id,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


def get_events(
    db: Session,
    user_id: int,
    status: str | None = None,
    groom_name: str | None = None,
    bride_name: str | None = None,
):
    query = db.query(Event).filter(event_access_filter(user_id))

    if status is not None:
        query = query.filter(Event.status == status)

    if groom_name is not None:
        query = query.filter(Event.groom_name.ilike(f"%{groom_name}%"))

    if bride_name is not None:
        query = query.filter(Event.bride_name.ilike(f"%{bride_name}%"))

    return query.all()


def get_event(db: Session, event_id: int, user_id: int):
    return (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == user_id)
        .first()
    )


def update_event(db: Session, event_id: int, event_data: EventUpdate, user_id: int):
    event = get_event(db, event_id, user_id)

    if event is None:
        return None

    previous_type = event.event_type
    previous_couple_names = event.couple_names
    previous_default_name = _default_event_name(previous_type, previous_couple_names)
    new_type = event_data.event_type.value if event_data.event_type is not None else previous_type
    groom_name, bride_name, couple_names = _event_people(event_data, new_type)

    event.event_type = new_type
    event.groom_name = groom_name
    event.bride_name = bride_name
    event.couple_names = couple_names
    if event_data.name is not None:
        event.name = event_data.name.strip()
    elif event.name == previous_default_name and (
        couple_names != previous_couple_names or new_type != previous_type
    ):
        event.name = _default_event_name(new_type, couple_names)
    event.event_date = event_data.event_date
    if event_data.event_time is not None:
        event.event_time = event_data.event_time

    if event_data.venue is not None:
        event.venue_name = event_data.venue.strip()
        if "venue_address" not in event_data.model_fields_set:
            event.venue_address = ""
    elif event_data.venue_name is not None:
        event.venue_name = event_data.venue_name.strip()

    if "venue_address" in event_data.model_fields_set:
        event.venue_address = (event_data.venue_address or "").strip()
    if "description" in event_data.model_fields_set:
        event.description = (event_data.description or "").strip() or None
    if event_data.target_contribution is not None:
        event.target_contribution = event_data.target_contribution
    if event_data.status is not None:
        event.status = event_data.status.value

    db.commit()
    db.refresh(event)

    return event


def delete_event(db: Session, event_id: int, user_id: int):
    event = get_event(db, event_id, user_id)

    if event is None:
        return None

    db.delete(event)
    db.commit()

    return event
