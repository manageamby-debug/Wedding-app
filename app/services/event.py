from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


def _event_couple_names(event_data: EventCreate | EventUpdate) -> tuple[str, str, str]:
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
    groom_name, bride_name, couple_names = _event_couple_names(event_data)
    venue = _event_venue(event_data)
    new_event = Event(
        name=(event_data.name or f"{couple_names} Wedding").strip(),
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
    query = db.query(Event).filter(Event.user_id == user_id)

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

    previous_couple_names = event.couple_names
    previous_default_name = f"{previous_couple_names} Wedding"
    groom_name, bride_name, couple_names = _event_couple_names(event_data)

    event.groom_name = groom_name
    event.bride_name = bride_name
    event.couple_names = couple_names
    if event_data.name is not None:
        event.name = event_data.name.strip()
    elif event.name == previous_default_name and couple_names != previous_couple_names:
        event.name = f"{couple_names} Wedding"
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
