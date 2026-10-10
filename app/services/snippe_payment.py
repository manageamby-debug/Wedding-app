"""Snippe mobile-money payments for contributions.

Flow:
1. The organizer starts a payment -> ``start_snippe_payment`` sends a USSD push
   to the guest's phone and stores the Snippe reference on the contribution.
2. Snippe calls our webhook -> ``process_webhook`` verifies the signature and
   marks the contribution paid (or failed).
3. If a webhook was missed (e.g. during local development), the organizer can
   ask for a status check -> ``refresh_snippe_payment``.
"""

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from snippe import (
    AuthenticationError,
    ConflictError,
    Customer,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    ServerError,
    Snippe,
    UnprocessableEntityError,
    ValidationError as SnippeValidationError,
    verify_webhook,
)

from app.models.contributions import Contribution
from app.models.event import Event
from app.models.guest import Guest
from app.services.payment_audit import create_payment_audit

load_dotenv()

logger = logging.getLogger(__name__)

PAID_STATUSES = ("paid", "confirmed")
FAILED_OUTCOMES = ("failed", "expired", "voided")


class SnippePaymentError(Exception):
    """A problem the API layer should report to the caller."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_client() -> Snippe:
    api_key = os.getenv("SNIPPE_API_KEY")

    if not api_key:
        raise SnippePaymentError(503, "Snippe payments are not configured on the server.")

    return Snippe(api_key)


def _webhook_url() -> str:
    base_url = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")

    if not base_url.startswith("https://"):
        raise SnippePaymentError(
            503,
            "PUBLIC_BASE_URL must be a public HTTPS address so Snippe can reach the webhook.",
        )

    return f"{base_url}/webhooks/snippe"


def normalize_tz_phone(raw: str | None) -> str:
    """Return a Tanzanian number as 0XXXXXXXXX, or raise if it is not valid."""
    digits = re.sub(r"\D", "", raw or "")

    if digits.startswith("255"):
        digits = "0" + digits[3:]
    elif len(digits) == 9:
        digits = "0" + digits

    if not re.fullmatch(r"0\d{9}", digits):
        raise SnippePaymentError(
            422,
            "This guest has no valid Tanzanian phone number. Edit the guest and try again.",
        )

    return digits


def _whole_tzs(amount: Decimal) -> int:
    if amount != amount.to_integral_value():
        raise SnippePaymentError(422, "Mobile money amounts must be whole TZS (no decimals).")

    return int(amount)


def _event_owner_id(db: Session, contribution: Contribution) -> int | None:
    return (
        db.query(Event.user_id)
        .join(Guest, Guest.event_id == Event.id)
        .filter(Guest.id == contribution.guest_id)
        .scalar()
    )


def _apply_outcome(
    db: Session,
    contribution: Contribution,
    outcome: str,
    owner_id: int | None,
) -> str:
    """Update a contribution from a Snippe result. Safe to call more than once."""
    already_paid = contribution.payment_status in PAID_STATUSES

    if outcome == "completed":
        if already_paid:
            return "duplicate"

        contribution.payment_status = "paid"
        contribution.paid_at = datetime.now(timezone.utc)
        contribution.transaction_reference = contribution.snippe_reference
        contribution.rejection_reason = None
        contribution.rejected_at = None
        description = "Paid by mobile money through Snippe"
        action = "payment_confirmed"

    elif outcome in FAILED_OUTCOMES:
        # Never downgrade a contribution that is already paid.
        if already_paid:
            return "ignored"

        contribution.payment_status = "failed"
        contribution.rejection_reason = f"Snippe payment {outcome}"
        contribution.rejected_at = datetime.now(timezone.utc)
        description = f"Snippe payment {outcome}"
        action = "payment_failed"

    else:
        return "ignored"

    if owner_id is not None:
        create_payment_audit(
            db=db,
            contribution_id=contribution.id,
            user_id=owner_id,
            action=action,
            description=description,
        )

    db.commit()
    db.refresh(contribution)

    return outcome


# ---------------------------------------------------------------------------
# Public API used by the routers
# ---------------------------------------------------------------------------

def start_snippe_payment(
    db: Session,
    contribution: Contribution,
    user_id: int,
) -> Contribution:
    if contribution.payment_status in PAID_STATUSES:
        raise SnippePaymentError(409, "This contribution is already paid.")

    if contribution.payment_status == "pending" and contribution.snippe_reference:
        raise SnippePaymentError(
            409,
            "A Snippe payment is already waiting for the guest to approve it on their phone. "
            "Use the status check if it has already been paid.",
        )

    guest = db.query(Guest).filter(Guest.id == contribution.guest_id).first()

    if guest is None:
        raise SnippePaymentError(404, "Guest not found")

    phone = normalize_tz_phone(guest.phone)
    amount = _whole_tzs(Decimal(contribution.amount))
    webhook_url = _webhook_url()
    client = _get_client()

    first_name, _, last_name = guest.full_name.strip().partition(" ")
    first_name = first_name or "Guest"
    customer_fields = {
        "firstname": first_name,
        "lastname": last_name.strip() or first_name,
    }
    if guest.email:
        customer_fields["email"] = guest.email

    # A fresh key per attempt (max 30 characters) so a retry after a failure is
    # a new payment, while a repeated request for the same attempt is not charged twice.
    idempotency_key = f"wc{contribution.id}-{uuid.uuid4().hex}"[:30]

    try:
        payment = client.create_mobile_payment(
            amount=amount,
            currency="TZS",
            phone_number=phone,
            customer=Customer(**customer_fields),
            webhook_url=webhook_url,
            metadata={"contribution_id": str(contribution.id)},
            idempotency_key=idempotency_key,
        )
    except AuthenticationError:
        logger.error("Snippe rejected the configured API key")
        raise SnippePaymentError(502, "The server's Snippe API key was rejected.")
    except SnippeValidationError as exc:
        raise SnippePaymentError(
            422, f"Snippe rejected the request: {getattr(exc, 'message', exc)}"
        )
    except RateLimitError:
        raise SnippePaymentError(429, "Too many requests to Snippe. Try again in a minute.")
    except (ForbiddenError, ConflictError, UnprocessableEntityError, NotFoundError, ServerError):
        logger.exception("Snippe could not create the payment")
        raise SnippePaymentError(502, "Snippe could not start this payment. Try again later.")
    except Exception:
        logger.exception("Could not reach Snippe")
        raise SnippePaymentError(502, "Could not reach Snippe. Check the connection and try again.")

    contribution.snippe_reference = payment.reference
    contribution.payment_status = "pending"
    contribution.rejection_reason = None
    contribution.rejected_at = None

    create_payment_audit(
        db=db,
        contribution_id=contribution.id,
        user_id=user_id,
        action="payment_initiated",
        description="Snippe mobile money request sent to the guest's phone",
    )

    db.commit()
    db.refresh(contribution)

    return contribution


def refresh_snippe_payment(
    db: Session,
    contribution: Contribution,
    user_id: int,
) -> Contribution:
    if not contribution.snippe_reference:
        raise SnippePaymentError(400, "No Snippe payment was started for this contribution.")

    client = _get_client()

    try:
        payment = client.get_payment(contribution.snippe_reference)
    except RateLimitError:
        raise SnippePaymentError(429, "Too many requests to Snippe. Try again in a minute.")
    except Exception:
        logger.exception("Could not read the Snippe payment status")
        raise SnippePaymentError(502, "Could not check the payment with Snippe.")

    status = getattr(payment.status, "value", payment.status)
    _apply_outcome(db, contribution, str(status).lower(), user_id)

    return contribution


def process_webhook(
    db: Session,
    body: str,
    signature: str,
    timestamp: str,
) -> str:
    """Verify and apply a Snippe webhook. Raises WebhookVerificationError if forged."""
    signing_key = os.getenv("SNIPPE_WEBHOOK_SECRET")

    if not signing_key:
        raise SnippePaymentError(503, "Snippe webhooks are not configured on the server.")

    payload = verify_webhook(
        body=body,
        signature=signature,
        timestamp=timestamp,
        signing_key=signing_key,
    )

    event = str(getattr(payload, "event", ""))
    reference = getattr(payload, "reference", None)

    if not event.startswith("payment.") or not reference:
        return "ignored"

    contribution = (
        db.query(Contribution)
        .filter(Contribution.snippe_reference == reference)
        .first()
    )

    if contribution is None:
        logger.warning("Snippe webhook for an unknown reference: %s", reference)
        return "unknown_reference"

    outcome = event.split(".", 1)[1]
    result = _apply_outcome(db, contribution, outcome, _event_owner_id(db, contribution))
    logger.info("Snippe webhook %s for contribution %s -> %s", event, contribution.id, result)

    return result
