from sqlalchemy.orm import Session

from app.models.rsvp import RSVP
from app.schemas.rsvp import RSVPCreate
from app.services import invitation as invitation_service


def create_or_update_rsvp(
    db: Session,
    short_code: str,
    rsvp_data: RSVPCreate,
):
    invitation = invitation_service.get_invitation_by_short_code(
        db, short_code
    )

    if invitation is None:
        return None

    guest_id = invitation["guest_id"]

    existing_rsvp = db.query(RSVP).filter(RSVP.guest_id == guest_id).first()

    if existing_rsvp is not None:
        existing_rsvp.status = rsvp_data.status.value

        db.commit()
        db.refresh(existing_rsvp)

        return existing_rsvp

    new_rsvp = RSVP(guest_id=guest_id, status=rsvp_data.status.value)

    db.add(new_rsvp)
    db.commit()
    db.refresh(new_rsvp)

    return new_rsvp
