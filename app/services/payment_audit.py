from app.core.event_access import event_access_filter
from sqlalchemy.orm import Session

from app.models.contributions import Contribution
from app.models.event import Event
from app.models.guest import Guest
from app.models.payment_audit import PaymentAudit


def create_payment_audit(
    db: Session,
    contribution_id: int,
    user_id: int,
    action: str,
    description: str | None = None,
) -> PaymentAudit:
    audit = PaymentAudit(
        contribution_id=contribution_id,
        user_id=user_id,
        action=action,
        description=description,
    )
    db.add(audit)
    return audit


def get_contribution_audits(
    db: Session,
    contribution_id: int,
    user_id: int,
) -> list[PaymentAudit] | None:
    contribution = (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Contribution.id == contribution_id,
            event_access_filter(user_id),
        )
        .first()
    )

    if contribution is None:
        return None

    return (
        db.query(PaymentAudit)
        .filter(PaymentAudit.contribution_id == contribution_id)
        .order_by(PaymentAudit.created_at.desc(), PaymentAudit.id.desc())
        .all()
    )
