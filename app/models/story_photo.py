from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StoryPhoto(Base):
    __tablename__ = "story_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    chapter: Mapped[str] = mapped_column(String(40), nullable=False, default="Uchumba")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    event = relationship("Event", back_populates="story_photos")

    @property
    def image_url(self) -> str:
        return f"/events/{self.event_id}/story-photos/{self.id}/content"
