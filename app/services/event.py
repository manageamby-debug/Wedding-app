from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


def create_event(db: Session, event_data: EventCreate) -> Event:
    new_event = Event(
        groom_name=event_data.groom_name,
        bride_name=event_data.bride_name,
        event_date=event_data.event_date,
        event_time=event_data.event_time,
        venue_name=event_data.venue_name,
        venue_address=event_data.venue_address,
        status=event_data.status.value,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


def get_events(db: Session) -> list[Event]:
    return db.query(Event).all()


def update_event(db: Session, event: Event, event_data: EventUpdate) -> Event:
    event.groom_name = event_data.groom_name
    event.bride_name = event_data.bride_name
    event.event_date = event_data.event_date
    event.event_time = event_data.event_time
    event.venue_name = event_data.venue_name
    event.venue_address = event_data.venue_address
    event.status = event_data.status.value
    db.commit()
    db.refresh(event)
    return event
