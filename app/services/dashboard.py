from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.guest import Guest
from app.models.rsvp import RSVP
from app.services import contribution as contribution_service


def get_event_dashboard(
    db: Session,
    event_id: int,
    user_id: int,
) -> dict | None:
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == user_id)
        .first()
    )

    if event is None:
        return None

    # =========================
    # GUESTS
    # =========================

    total_guests = (
        db.query(Guest)
        .filter(
            Guest.event_id == event_id
        )
        .count()
    )

    # =========================
    # RSVP
    # =========================

    attending = (
        db.query(RSVP)
        .join(
            Guest,
            RSVP.guest_id == Guest.id
        )
        .filter(
            Guest.event_id == event_id,
            RSVP.status == "attending"
        )
        .count()
    )

    not_attending = (
        db.query(RSVP)
        .join(
            Guest,
            RSVP.guest_id == Guest.id
        )
        .filter(
            Guest.event_id == event_id,
            RSVP.status == "not_attending"
        )
        .count()
    )

    maybe = (
        db.query(RSVP)
        .join(
            Guest,
            RSVP.guest_id == Guest.id
        )
        .filter(
            Guest.event_id == event_id,
            RSVP.status == "maybe"
        )
        .count()
    )

    no_response = total_guests - (
        attending +
        not_attending +
        maybe
    )

    # =========================
    # CHECK-IN
    # =========================

    checked_in = (
        db.query(Guest)
        .filter(
            Guest.event_id == event_id,
            Guest.check_in_status == "checked_in"
        )
        .count()
    )

    not_checked_in = total_guests - checked_in

    if total_guests == 0:
        check_in_percentage = 0.0
    else:
        check_in_percentage = round(
            (checked_in / total_guests) * 100,
            2
        )

    contribution_data = contribution_service.get_contribution_summary(
        db,
        event_id,
        user_id,
    )

    if contribution_data is None:
        return None

    # =========================
    # RESPONSE
    # =========================

    return {
        "event": {
            "id": event.id,
            "name": f"{event.groom_name} & {event.bride_name} Wedding",
            "event_date": event.event_date,
            "location": ", ".join(
                value
                for value in (event.venue_name, event.venue_address)
                if value
            ) or None,
        },
        "guests": {
            "total": total_guests
        },

        "rsvp": {
            "attending": attending,
            "not_attending": not_attending,
            "maybe": maybe,
            "no_response": no_response
        },

        "check_in": {
            "checked_in": checked_in,
            "not_checked_in": not_checked_in,
            "percentage": check_in_percentage
        },

        "contributions": {
            "contributors": contribution_data["contributors"],
            "total_expected": contribution_data["total_expected"],
            "total_paid": contribution_data["total_paid"],
            "total_pending": contribution_data["total_pending"]
        }
    }
