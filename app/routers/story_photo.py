from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.event_access import require_event_owner
from app.models.event import Event
from app.models.story_photo import StoryPhoto
from app.schemas.story_photo import StoryPhotoResponse
from app.services import story_photo as story_photo_service

router = APIRouter()
VALID_CHAPTERS = {"Tulipokutana", "Uchumba", "Posa", "Maandalizi", "Harusi"}


@router.get(
    "/events/{event_id}/story-photos",
    response_model=list[StoryPhotoResponse],
)
def list_story_photos(
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    return (
        db.query(StoryPhoto)
        .filter(StoryPhoto.event_id == event.id)
        .order_by(StoryPhoto.created_at.desc(), StoryPhoto.id.desc())
        .all()
    )


@router.post(
    "/events/{event_id}/story-photos",
    response_model=StoryPhotoResponse,
    status_code=201,
)
async def upload_story_photo(
    file: UploadFile = File(...),
    chapter: str = Form(default="Uchumba"),
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    chapter = chapter.strip()
    if chapter not in VALID_CHAPTERS:
        raise HTTPException(status_code=422, detail="Choose a valid story chapter")

    data = await file.read(story_photo_service.MAX_PHOTO_BYTES + 1)
    if len(data) > story_photo_service.MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Each photo must be 10 MB or smaller")

    extension = story_photo_service.detect_image_type(data)
    if extension is None:
        raise HTTPException(
            status_code=415,
            detail="Choose a JPG, PNG, or WebP photo",
        )

    return story_photo_service.save_story_photo(
        db=db,
        event=event,
        data=data,
        extension=extension,
        chapter=chapter,
    )


@router.get("/events/{event_id}/story-photos/{photo_id}/content")
def get_story_photo_content(
    photo_id: int,
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    photo = (
        db.query(StoryPhoto)
        .filter(StoryPhoto.id == photo_id, StoryPhoto.event_id == event.id)
        .first()
    )
    if photo is None:
        raise HTTPException(status_code=404, detail="Story photo not found")

    result = story_photo_service.get_story_photo_file(photo)
    if result is None:
        raise HTTPException(status_code=404, detail="Story photo file not found")

    path, media_type = result
    return FileResponse(path, media_type=media_type)


@router.delete("/events/{event_id}/story-photos/{photo_id}", status_code=204)
def remove_story_photo(
    photo_id: int,
    event: Event = Depends(require_event_owner),
    db: Session = Depends(get_db),
):
    photo = (
        db.query(StoryPhoto)
        .filter(StoryPhoto.id == photo_id, StoryPhoto.event_id == event.id)
        .first()
    )
    if photo is None:
        raise HTTPException(status_code=404, detail="Story photo not found")

    story_photo_service.delete_story_photo(db, photo)
