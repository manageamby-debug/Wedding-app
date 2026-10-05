from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.contributions import Contribution
from app.models.event import Event
from app.models.guest import Guest
from app.schemas import contribution
from app.schemas.contribution import ContributionCreate


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
    user_id: int
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
        return None

    contribution.payment_status = "confirmed"
    contribution.paid_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(contribution)

    return contribution

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

    return (
        db.query(Contribution)
        .join(Guest, Contribution.guest_id == Guest.id)
        .filter(Guest.event_id == event_id)
        .all()
    )

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
                    (Contribution.payment_status == "confirmed",
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
            Contribution.payment_status == "confirmed"
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

    if contribution.payment_status != "confirmed":
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