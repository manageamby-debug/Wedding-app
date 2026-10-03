from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.services import event as event_services

router = APIRouter()


@router.post("/events", response_model=EventResponse, status_code=201)
def create_event(event_data: EventCreate, db: Session = Depends(get_db)):
    return event_services.create_event(db, event_data)


@router.get("/events", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db)):
    return event_services.get_events(db)


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
):
    existing_event = db.query(Event).filter(Event.id == event_id).first()
    if existing_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_services.update_event(db, existing_event, event_data)


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    existing_event = db.query(Event).filter(Event.id == event_id).first()
    if existing_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(existing_event)
    db.commit()
    return {"message": "Event deleted successfully"}
