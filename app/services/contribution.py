from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.contributions import Contribution
from app.models.event import Event
from app.models.guest import Guest
from app.schemas.contribution import ContributionCreate
from app.services.payment_audit import create_payment_audit


def create_contribution(
    db: Session,
    contribution_data: ContributionCreate,
    user_id: int,
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == contribution_data.guest_id,
            Event.user_id == user_id,
        )
        .first()
    )

    if guest is None:
        return None

    new_contribution = Contribution(
        guest_id=contribution_data.guest_id,
        amount=contribution_data.amount,
        payment_method=contribution_data.payment_method.value,
        payment_status="pending",
        transaction_reference=contribution_data.transaction_reference,
    )

    db.add(new_contribution)
    db.commit()
    db.refresh(new_contribution)

    return new_contribution


def confirm_contribution(
    db: Session,
    contribution_id: int,
    user_id: int,
    transaction_reference: str | None = None,
):
    contribution = (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Contribution.id == contribution_id,
            Event.user_id == user_id
        )
        .first()
    )

    if contribution is None:
        return None, "not_found"

    if contribution.payment_status in ("paid", "confirmed"):
        return contribution, "already_paid"

    contribution.payment_status = "paid"
    contribution.transaction_reference = transaction_reference
    contribution.paid_at = datetime.now(timezone.utc)

    create_payment_audit(
        db=db,
        contribution_id=contribution.id,
        user_id=user_id,
        action="payment_confirmed",
        description="Contribution payment confirmed",
    )

    db.commit()
    db.refresh(contribution)

    return contribution, "paid"

def get_event_contributions(
    db: Session,
    event_id: int,
    user_id: int
):
    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user_id
        )
        .first()
    )

    if event is None:
        return None

    results = (
        db.query(Contribution, Guest.full_name)
        .join(Guest, Contribution.guest_id == Guest.id)
        .filter(Guest.event_id == event_id)
        .order_by(Contribution.id.desc())
        .all()
    )

    return [
        {
            "id": contribution.id,
            "guest_id": contribution.guest_id,
            "guest_name": guest_name,
            "amount": contribution.amount,
            "payment_method": contribution.payment_method,
            "payment_status": contribution.payment_status,
            "transaction_reference": contribution.transaction_reference,
            "paid_at": contribution.paid_at,
            "rejection_reason": contribution.rejection_reason,
            "rejected_at": contribution.rejected_at,
        }
        for contribution, guest_name in results
    ]

def get_event_contribution_summary(
    db: Session,
    event_id: int,
    user_id: int
):
    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user_id
        )
        .first()
    )

    if event is None:
        return None

    result = (
        db.query(
            func.count(Contribution.id).label("total_contributions"),

            func.sum(
                case(
                    (Contribution.payment_status.in_(("confirmed", "paid")),
                     Contribution.amount),
                    else_=0
                )
            ).label("confirmed_amount"),

            func.sum(
                case(
                    (Contribution.payment_status == "pending",
                     Contribution.amount),
                    else_=0
                )
            ).label("pending_amount")
        )
        .join(Guest, Contribution.guest_id == Guest.id)
        .filter(Guest.event_id == event_id)
        .one()
    )

    total_contributions = result.total_contributions or 0
    confirmed_amount = result.confirmed_amount or 0
    pending_amount = result.pending_amount or 0

    confirmed_contributions = (
        db.query(func.count(Contribution.id))
        .join(Guest, Contribution.guest_id == Guest.id)
        .filter(
            Guest.event_id == event_id,
            Contribution.payment_status.in_(("confirmed", "paid"))
        )
        .scalar()
    )

    pending_contributions = (
        db.query(func.count(Contribution.id))
        .join(Guest, Contribution.guest_id == Guest.id)
        .filter(
            Guest.event_id == event_id,
            Contribution.payment_status == "pending"
        )
        .scalar()
    )

    return {
        "total_contributions": total_contributions,
        "confirmed_contributions": confirmed_contributions or 0,
        "pending_contributions": pending_contributions or 0,
        "total_amount": confirmed_amount + pending_amount,
        "confirmed_amount": confirmed_amount,
        "pending_amount": pending_amount
    }



def get_contribution_receipt(
    db: Session,
    contribution_id: int,
    user_id: int
):
    result = (
        db.query(Contribution, Guest, Event)
        .join(Guest, Contribution.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Contribution.id == contribution_id,
            Event.user_id == user_id
        )
        .first()
    )

    if result is None:
        return None

    

    contribution, guest, event = result

    if contribution.payment_status not in ("confirmed", "paid"):
        return None

    return {
        "contribution_id": contribution.id,
        "guest_id": guest.id,
        "guest_name": guest.full_name,
        "event_id": event.id,
        "groom_name": event.groom_name,
        "bride_name": event.bride_name,
        "amount": contribution.amount,
        "payment_method": contribution.payment_method,
        "payment_status": contribution.payment_status,
        "transaction_reference": contribution.transaction_reference,
        "paid_at": contribution.paid_at
    }


def get_contribution_summary(
    db: Session,
    event_id: int,
    user_id: int,
) -> dict | None:
    """Summarize expected and confirmed contributions for the user's event."""
    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == user_id,
        )
        .first()
    )

    if event is None:
        return None

    event_contributions = (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .filter(Guest.event_id == event_id)
    )

    total_guests = (
        db.query(Guest)
        .filter(Guest.event_id == event_id)
        .count()
    )

    contributors = event_contributions.with_entities(
        func.count(func.distinct(Contribution.guest_id))
    ).scalar() or 0

    amounts = event_contributions.with_entities(
        func.coalesce(func.sum(Contribution.amount), 0),
        func.coalesce(
            func.sum(
                case(
                    (Contribution.payment_status.in_(("confirmed", "paid")), Contribution.amount),
                    else_=0,
                )
            ),
            0,
        ),
    ).one()

    total_expected, total_paid = amounts

    return {
        "total_guests": total_guests,
        "contributors": contributors,
        "total_expected": total_expected,
        "total_paid": total_paid,
        "total_pending": total_expected - total_paid,
    }


def create_manual_contribution(
    db: Session,
    guest_id: int,
    amount: Decimal,
    payment_method: str,
    user_id: int,
    transaction_reference: str | None = None,
):
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == guest_id,
            Event.user_id == user_id,
        )
        .first()
    )

    if guest is None:
        return None

    contribution = Contribution(
        guest_id=guest_id,
        amount=amount,
        payment_method=payment_method,
        payment_status="paid",
        transaction_reference=transaction_reference,
        paid_at=datetime.now(timezone.utc),
    )

    db.add(contribution)
    db.commit()
    db.refresh(contribution)

    return contribution


def get_guest_contributions(
    db: Session,
    guest_id: int,
    user_id: int,
) -> dict | None:
    guest = (
        db.query(Guest)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == guest_id,
            Event.user_id == user_id,
        )
        .first()
    )

    if guest is None:
        return None

    contributions = (
        db.query(Contribution)
        .filter(Contribution.guest_id == guest_id)
        .order_by(Contribution.id.desc())
        .all()
    )

    total_paid = sum(
        (
            contribution.amount
            for contribution in contributions
            if contribution.payment_status in ("paid", "confirmed")
        ),
        Decimal("0"),
    )
    total_pending = sum(
        (
            contribution.amount
            for contribution in contributions
            if contribution.payment_status == "pending"
        ),
        Decimal("0"),
    )

    contribution_list = [
        {
            "id": contribution.id,
            "guest_id": contribution.guest_id,
            "guest_name": guest.full_name,
            "amount": contribution.amount,
            "payment_method": contribution.payment_method,
            "payment_status": contribution.payment_status,
            "transaction_reference": contribution.transaction_reference,
            "paid_at": contribution.paid_at,
            "rejection_reason": contribution.rejection_reason,
            "rejected_at": contribution.rejected_at,
        }
        for contribution in contributions
    ]

    return {
        "guest_id": guest.id,
        "guest_name": guest.full_name,
        "total_contributions": len(contributions),
        "total_paid": total_paid,
        "total_pending": total_pending,
        "contributions": contribution_list,
    }


def reject_contribution(
    db: Session,
    contribution_id: int,
    rejection_reason: str,
    user_id: int,
):
    contribution = (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Contribution.id == contribution_id,
            Event.user_id == user_id,
        )
        .first()
    )

    if contribution is None:
        return None, "not_found"

    if contribution.payment_status in ("paid", "confirmed"):
        return contribution, "already_paid"

    if contribution.payment_status == "rejected":
        return contribution, "already_rejected"

    contribution.payment_status = "rejected"
    contribution.rejection_reason = rejection_reason
    contribution.rejected_at = datetime.now(timezone.utc)

    create_payment_audit(
        db=db,
        contribution_id=contribution.id,
        user_id=user_id,
        action="payment_rejected",
        description=rejection_reason,
    )

    db.commit()
    db.refresh(contribution)

    return contribution, "rejected"
