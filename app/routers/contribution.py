from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.schemas.contribution import ContributionCreate, ContributionResponse
from app.services import contribution as contribution_service

router = APIRouter()


@router.post(
    "/contributions",
    response_model=ContributionResponse,
    status_code=201,
)
def create_contribution(
    contribution_data: ContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    contribution = contribution_service.create_contribution(
        db, contribution_data, current_user.id
    )

    if contribution is None:
        raise HTTPException(status_code=404, detail="Guest not found")

    return contribution

@router.post(
    "/contributions/{contribution_id}/confirm",
    response_model=ContributionResponse
)
def confirm_contribution(
    contribution_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("organizer"))
):
    contribution = contribution_service.confirm_contribution(
        db,
        contribution_id,
        current_user.id
    )

    if contribution is None:
        raise HTTPException(
            status_code=404,
            detail="Contribution not found"
        )

    return contribution

@router.get(
    "/events/{event_id}/contributions",
    response_model=list[ContributionResponse]
)
def get_event_contributions(
    event_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("organizer"))
):
    contributions = contribution_service.get_event_contributions(
        db,
        event_id,
        current_user.id
    )

    if contributions is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return contributions


@router.get(
    "/events/{event_id}/contributions/summary"
)
def get_event_contribution_summary(
    event_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("organizer"))
):
    summary = contribution_service.get_event_contribution_summary(
        db,
        event_id,
        current_user.id
    )

    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return summary

@router.get(
    "/contributions/{contribution_id}/receipt"
)
def get_contribution_receipt(
    contribution_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("organizer"))
):
    receipt = contribution_service.get_contribution_receipt(
        db,
        contribution_id,
        current_user.id
    )

    if receipt is None:
        raise HTTPException(
            status_code=404,
            detail="Contribution not found"
        )

    return receipt