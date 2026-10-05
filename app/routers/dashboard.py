from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.event_access import require_event_owner
from app.core.database import get_db
from app.models.event import Event
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard as dashboard_service


router = APIRouter()


@router.get(
    "/events/{event_id}/dashboard",
    response_model=DashboardResponse
)
def get_event_dashboard(
    event_id: int,
    db: Session = Depends(get_db),
    event: Event = Depends(require_event_owner),
):
    result = dashboard_service.get_event_dashboard(
        db,
        event.id,
        event.user_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return result
