from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StoryPhotoResponse(BaseModel):
    id: int
    event_id: int
    chapter: str
    created_at: datetime
    image_url: str

    model_config = ConfigDict(from_attributes=True)
