from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import get_accessible_event, require_event_manager
from app.core.security import get_current_user, require_role
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventResponse, EventStatus, EventUpdate
from app.services import event as event_services

router = APIRouter()


@router.post("/events", response_model=EventResponse, status_code=201)
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    return event_services.create_event(db, event_data, current_user.id)


@router.get("/events", response_model=list[EventResponse])
def get_events(
    status: EventStatus | None = Query(default=None),
    groom_name: str | None = Query(default=None),
    bride_name: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_value = status.value if status is not None else None
    return event_services.get_events(
        db, current_user.id, status_value, groom_name, bride_name
    )


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_accessible_event(db, event_id, current_user.id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
    manager: Event = Depends(require_event_manager),
):
    event = event_services.update_event(db, event_id, event_data, manager.user_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    manager: Event = Depends(require_event_manager),
):
    event = event_services.delete_event(db, event_id, manager.user_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return {"message": "Event deleted successfully"}
