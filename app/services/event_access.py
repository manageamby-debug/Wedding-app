from sqlalchemy.orm import Session

from app.models.event import Event


def get_owned_event(
    db: Session,
    event_id: int,
    user_id: int,
) -> Event | None:
    return (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user_id,
        )
        .first()
    )
