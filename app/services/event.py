from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


def create_event(db: Session, event_data: EventCreate, user_id: int):
    new_event = Event(
        groom_name=event_data.groom_name,
        bride_name=event_data.bride_name,
        event_date=event_data.event_date,
        event_time=event_data.event_time,
        venue_name=event_data.venue_name,
        venue_address=event_data.venue_address,
        status=event_data.status.value,
        user_id=user_id,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


def get_events(db: Session, user_id: int, 
               status: str | None = None,
               groom_name: str | None = None,
               bride_name: str | None = None,
               
    ):
    
    query = db.query(Event).filter(Event.user_id == user_id)

    if status is not None:
        query = query.filter(Event.status == status)

    if groom_name is not None:
        query =query.filter(
            Event.groom_name.ilike(f"%{groom_name}%")

        )

    if bride_name is not None:
        query =query.filter(
            Event.bride_name.ilike(f"%{bride_name}%")
        )
        
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


def delete_event(db: Session, event_id: int, user_id: int):
    event = get_event(db, event_id, user_id)

    if event is None:
        return None

    db.delete(event)
    db.commit()

    return event
