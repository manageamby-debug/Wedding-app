from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import require_contribution_owner
from app.models.contributions import Contribution
from app.schemas.payment_audit import PaymentAuditResponse
from app.services import payment_audit as payment_audit_service


router = APIRouter()


@router.get(
    "/contributions/{contribution_id}/audit",
    response_model=list[PaymentAuditResponse],
)
def get_contribution_audit(
    contribution: Contribution = Depends(require_contribution_owner),
    db: Session = Depends(get_db),
):
    return payment_audit_service.get_contribution_audits(
        db,
        contribution.id,
        contribution.guest.event.user_id,
    )
