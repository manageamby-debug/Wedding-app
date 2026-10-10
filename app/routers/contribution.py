from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import event_access_filter, require_contribution_owner, require_event_owner
from app.core.security import get_current_user
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
from app.services import payment_proof as payment_proof_service

router = APIRouter()


@router.post(
    "/contributions",
    response_model=ContributionResponse,
    status_code=201,
)
def create_contribution(
    contribution_data: ContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user = Depends(get_current_user)
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
    current_user = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user),
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == contribution_data.guest_id,
            event_access_filter(current_user.id),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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


@router.post(
    "/contributions/{contribution_id}/payment-proof",
    response_model=ContributionPaymentResponse,
)
async def upload_payment_proof(
    file: UploadFile = File(...),
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    max_bytes = payment_proof_service.MAX_PROOF_BYTES
    data = await file.read(max_bytes + 1)

    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")

    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail="Payment proof must be 5 MB or smaller",
        )

    extension = payment_proof_service.detect_image_type(data)

    if extension is None:
        raise HTTPException(
            status_code=415,
            detail="Payment proof must be a JPEG, PNG or WebP image",
        )

    # Uploading proof never changes the payment status; the organizer still has
    # to confirm the payment separately.
    return payment_proof_service.save_payment_proof(
        db,
        contribution,
        data,
        extension,
        current_user.id,
    )


@router.get("/contributions/{contribution_id}/payment-proof")
def get_payment_proof(
    contribution: Contribution = Depends(require_contribution_owner),
):
    proof = payment_proof_service.get_payment_proof_file(contribution)

    if proof is None:
        raise HTTPException(
            status_code=404,
            detail="No payment proof uploaded for this contribution",
        )

    path, media_type = proof
    return FileResponse(path, media_type=media_type)
