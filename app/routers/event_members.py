from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import require_event_manager, require_event_owner
from app.models.event import Event
from app.schemas.event_member import EventMemberCreate, EventMemberResponse
from app.services import event_members


router = APIRouter()


@router.get("/events/{event_id}/members", response_model=list[EventMemberResponse])
def get_event_members(event: Event = Depends(require_event_owner), db: Session = Depends(get_db)):
    return event_members.list_members(db, event)


@router.post("/events/{event_id}/members", response_model=EventMemberResponse, status_code=status.HTTP_201_CREATED)
def add_event_member(
    member_data: EventMemberCreate,
    event: Event = Depends(require_event_manager),
    db: Session = Depends(get_db),
):
    member = event_members.add_member(db, event, member_data.email, member_data.position)
    return {
        "id": member.id,
        "user_id": member.user.id,
        "full_name": member.user.full_name,
        "email": member.user.email,
        "position": member.position,
    }


@router.delete("/events/{event_id}/members/{member_id}")
def delete_event_member(
    member_id: int,
    event: Event = Depends(require_event_manager),
    db: Session = Depends(get_db),
):
    if not event_members.remove_member(db, event, member_id):
        raise HTTPException(status_code=404, detail="Committee member not found")
    return {"message": "Committee member removed"}
