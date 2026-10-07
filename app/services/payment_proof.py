import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.contributions import Contribution
from app.services.payment_audit import create_payment_audit

# <project root>/uploads/payment_proofs  (kept out of git, never served as static files)
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "payment_proofs"
MAX_PROOF_BYTES = 5 * 1024 * 1024

MEDIA_TYPES = {
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


def detect_image_type(data: bytes) -> str | None:
    """Identify the real image type from the file's first bytes.

    The file name and the client's Content-Type header are never trusted.
    """
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def save_payment_proof(
    db: Session,
    contribution: Contribution,
    data: bytes,
    extension: str,
    user_id: int,
) -> Contribution:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    new_name = f"{uuid.uuid4().hex}.{extension}"
    new_path = UPLOAD_DIR / new_name
    new_path.write_bytes(data)

    old_name = contribution.payment_proof
    contribution.payment_proof = new_name

    # The payment status is intentionally left untouched: a proof upload never
    # marks a contribution as paid.
    create_payment_audit(
        db=db,
        contribution_id=contribution.id,
        user_id=user_id,
        action="payment_proof_uploaded",
        description="Payment proof uploaded",
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        new_path.unlink(missing_ok=True)
        raise

    db.refresh(contribution)

    if old_name:
        (UPLOAD_DIR / Path(old_name).name).unlink(missing_ok=True)

    return contribution


def get_payment_proof_file(contribution: Contribution) -> tuple[Path, str] | None:
    if not contribution.payment_proof:
        return None

    # Path(...).name drops any directory part, so a stored value can never escape UPLOAD_DIR.
    path = UPLOAD_DIR / Path(contribution.payment_proof).name

    if not path.is_file():
        return None

    media_type = MEDIA_TYPES.get(path.suffix.lstrip(".").lower(), "application/octet-stream")
    return path, media_type
