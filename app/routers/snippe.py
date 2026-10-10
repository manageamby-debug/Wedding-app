from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from snippe import WebhookVerificationError

from app.core.database import get_db
from app.core.event_access import require_contribution_owner
from app.core.security import require_role
from app.models.contributions import Contribution
from app.models.user import User
from app.schemas.contribution import ContributionPaymentResponse
from app.services import snippe_payment as snippe_service
from app.services.snippe_payment import SnippePaymentError

router = APIRouter()


@router.post(
    "/contributions/{contribution_id}/snippe-pay",
    response_model=ContributionPaymentResponse,
)
def pay_with_snippe(
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    """Send a mobile-money (USSD) request to the guest's phone."""
    try:
        return snippe_service.start_snippe_payment(db, contribution, current_user.id)
    except SnippePaymentError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)


@router.post(
    "/contributions/{contribution_id}/snippe-refresh",
    response_model=ContributionPaymentResponse,
)
def refresh_snippe_payment(
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    """Ask Snippe for the latest status (useful if a webhook was missed)."""
    try:
        return snippe_service.refresh_snippe_payment(db, contribution, current_user.id)
    except SnippePaymentError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)


@router.post("/webhooks/snippe")
async def snippe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """Public endpoint called by Snippe. Trust nothing until the signature checks out."""
    signature = request.headers.get("X-Webhook-Signature")
    timestamp = request.headers.get("X-Webhook-Timestamp")

    if not signature or not timestamp:
        raise HTTPException(status_code=400, detail="Missing webhook signature headers")

    # The signature covers the exact bytes Snippe sent, so read the raw body.
    body = (await request.body()).decode("utf-8")

    try:
        result = snippe_service.process_webhook(db, body, signature, timestamp)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except SnippePaymentError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)

    # Always answer 200 once the signature is valid so Snippe does not keep retrying.
    return {"received": True, "result": result}
