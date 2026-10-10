from app.core.event_access import event_access_filter
import secrets

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.guest import Guest
from app.models.invitation import Invitation
from app.schemas.invitation import InvitationCreate


def _invitation_payload(invitation: Invitation, guest: Guest, event: Event):
    return {
        "id": invitation.id,
        "guest_id": guest.id,
        "guest_name": guest.full_name,
        "groom_name": event.groom_name,
        "bride_name": event.bride_name,
        "event_date": event.event_date,
        "event_time": event.event_time,
        "venue_name": event.venue_name,
        "venue_address": event.venue_address,
        "invitation_code": invitation.invitation_code,
        "short_code": invitation.short_code,
        "status": invitation.status,
        "created_at": invitation.created_at,
    }


def create_invitation(
    db: Session,
    invitation_data: InvitationCreate,
    user_id: int,
):
    result = (
        db.query(Guest, Event)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Guest.id == invitation_data.guest_id,
            event_access_filter(user_id),
        )
        .first()
    )

    if result is None:
        return None

    guest, event = result

    # Guest tayari ana invitation? Irudishe badala ya kutengeneza nyingine.
    invitation = (
        db.query(Invitation).filter(Invitation.guest_id == guest.id).first()
    )

    if invitation is None:
        invitation = Invitation(
            guest_id=guest.id,
            invitation_code=f"INV-{secrets.token_hex(6).upper()}",
            # The short code is a bearer capability for public invitation/RSVP
            # access, so give it 192 bits of random entropy.
            short_code=secrets.token_urlsafe(24),
            status="active",
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)

    return _invitation_payload(invitation, guest, event)


def get_invitation_by_short_code(db: Session, short_code: str):
    result = (
        db.query(Invitation, Guest, Event)
        .join(Guest, Invitation.guest_id == Guest.id)
        .join(Event, Guest.event_id == Event.id)
        .filter(
            Invitation.short_code == short_code,
            Invitation.status == "active",
        )
        .first()
    )

    if result is None:
        return None

    invitation, guest, event = result

    return _invitation_payload(invitation, guest, event)
