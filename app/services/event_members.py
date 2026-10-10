from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.event_member import EventMember
from app.models.user import User


POSITIONS = {"vice_chair", "secretary", "treasurer", "member"}


def list_members(db: Session, event: Event) -> list[dict]:
    result = [{
        "id": 0,
        "user_id": event.user.id,
        "full_name": event.user.full_name,
        "email": event.user.email,
        "position": "chair",
    }]
    result.extend({
        "id": member.id,
        "user_id": member.user.id,
        "full_name": member.user.full_name,
        "email": member.user.email,
        "position": member.position,
    } for member in db.query(EventMember).filter(EventMember.event_id == event.id).all())
    return result


def add_member(db: Session, event: Event, email: str, position: str) -> EventMember:
    normalized_position = position.strip().lower()
    if normalized_position not in POSITIONS:
        raise HTTPException(status_code=422, detail="Choose chair, secretary, treasurer, or member")

    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if user is None:
        raise HTTPException(status_code=404, detail="No account is registered with that email yet")
    if user.id == event.user_id:
        raise HTTPException(status_code=409, detail="The event owner is already the chair")

    membership = db.query(EventMember).filter(
        EventMember.event_id == event.id,
        EventMember.user_id == user.id,
    ).first()
    if membership is None:
        membership = EventMember(event_id=event.id, user_id=user.id, position=normalized_position)
        db.add(membership)
    else:
        membership.position = normalized_position

    db.commit()
    db.refresh(membership)
    return membership


def remove_member(db: Session, event: Event, member_id: int) -> bool:
    membership = db.query(EventMember).filter(
        EventMember.event_id == event.id,
        EventMember.id == member_id,
    ).first()
    if membership is None:
        return False
    db.delete(membership)
    db.commit()
    return True
