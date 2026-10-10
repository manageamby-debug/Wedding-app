import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.story_photo import StoryPhoto

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "story_photos"
MAX_PHOTO_BYTES = 10 * 1024 * 1024

MEDIA_TYPES = {
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


def detect_image_type(data: bytes) -> str | None:
    """Use the file signature rather than trusting the client extension."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def save_story_photo(
    db: Session,
    event: Event,
    data: bytes,
    extension: str,
    chapter: str,
) -> StoryPhoto:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid.uuid4().hex}.{extension}"
    file_path = UPLOAD_DIR / file_name
    file_path.write_bytes(data)
    photo = StoryPhoto(event_id=event.id, file_name=file_name, chapter=chapter)
    db.add(photo)
    try:
        db.commit()
    except Exception:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise
    db.refresh(photo)
    return photo


def get_story_photo_file(photo: StoryPhoto) -> tuple[Path, str] | None:
    # The stored value is a generated basename, so it cannot traverse directories.
    path = UPLOAD_DIR / Path(photo.file_name).name
    if not path.is_file():
        return None
    extension = path.suffix.lstrip(".").lower()
    media_type = MEDIA_TYPES.get(extension)
    if media_type is None:
        return None
    return path, media_type


def delete_story_photo(db: Session, photo: StoryPhoto) -> None:
    photo_path = UPLOAD_DIR / Path(photo.file_name).name
    db.delete(photo)
    db.commit()
    photo_path.unlink(missing_ok=True)
