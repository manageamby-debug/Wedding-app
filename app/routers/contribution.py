from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import require_contribution_owner, require_event_owner
from app.core.security import require_role
from app.models.contributions import Contribution
from app.models.event import Event
from app.models.guest import Guest
from app.models.user import User
from app.schemas.contribution import (
    ContributionCreate,
    ContributionConfirm,
    ContributionListResponse,
    ContributionPaymentUpdate,
    ContributionPaymentResponse,
    ContributionReject,
    ContributionRejectionResponse,
    ContributionResponse,
    ContributionSummaryResponse,
    GuestContributionSummaryResponse,
    ManualContributionCreate,
)
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


@router.put(
    "/contributions/{contribution_id}",
    response_model=ContributionResponse,
)
def update_contribution_payment(
    payment_data: ContributionPaymentUpdate,
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
):
    contribution, status = contribution_service.update_contribution_payment(
        db,
        contribution,
        payment_data,
    )

    if status == "already_paid":
        raise HTTPException(
            status_code=409,
            detail="Paid contribution payment details cannot be changed",
        )

    return contribution


@router.post(
    "/contributions/{contribution_id}/confirm",
    response_model=ContributionPaymentResponse
)
def confirm_contribution(
    payment_data: ContributionConfirm,
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    contribution, status = contribution_service.confirm_contribution(
        db,
        contribution.id,
        current_user.id,
        payment_data.transaction_reference,
    )

    if status == "not_found":
        raise HTTPException(
            status_code=404,
            detail="Contribution not found"
        )

    if status == "already_paid":
        raise HTTPException(
            status_code=409,
            detail="Contribution already paid"
        )

    return contribution

@router.get(
    "/events/{event_id}/contributions",
    response_model=list[ContributionListResponse]
)
def get_event_contributions(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    contributions = contribution_service.get_event_contributions(
        db,
        event.id,
        event.user_id,
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


@router.get(
    "/events/{event_id}/contribution-summary",
    response_model=ContributionSummaryResponse
)
def get_contribution_summary(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    summary = contribution_service.get_contribution_summary(
        db,
        event.id,
        event.user_id,
    )

    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found",
        )

    return summary


@router.post(
    "/contributions/manual",
    response_model=ContributionPaymentResponse,
    status_code=201,
)
def create_manual_contribution(
    contribution_data: ManualContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == contribution_data.guest_id,
            Event.user_id == current_user.id,
        )
        .first()
    )

    if guest is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found",
        )

    contribution = contribution_service.create_manual_contribution(
        db,
        contribution_data.guest_id,
        contribution_data.amount,
        contribution_data.payment_method,
        current_user.id,
        contribution_data.transaction_reference,
    )

    if contribution is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found",
        )

    return contribution


@router.get(
    "/guests/{guest_id}/contributions",
    response_model=GuestContributionSummaryResponse,
)
def get_guest_contributions(
    guest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    result = contribution_service.get_guest_contributions(
        db,
        guest_id,
        current_user.id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Guest not found",
        )

    return result


@router.post(
    "/contributions/{contribution_id}/reject",
    response_model=ContributionRejectionResponse,
)
def reject_contribution(
    payment_data: ContributionReject,
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    contribution, status = contribution_service.reject_contribution(
        db,
        contribution.id,
        payment_data.rejection_reason,
        current_user.id,
    )

    if status == "not_found":
        raise HTTPException(
            status_code=404,
            detail="Contribution not found",
        )

    if status == "already_paid":
        raise HTTPException(
            status_code=409,
            detail="Paid contribution cannot be rejected",
        )

    if status == "already_rejected":
        raise HTTPException(
            status_code=409,
            detail="Contribution already rejected",
        )

    return contribution
