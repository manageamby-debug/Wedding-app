from datetime import date, time

from sqlalchemy import Date, Integer, String, Time , ForeignKey
from sqlalchemy.orm import Mapped, mapped_column , relationship

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="events")

    groom_name: Mapped[str] = mapped_column(String, nullable=False)
    bride_name: Mapped[str] = mapped_column(String, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    event_time: Mapped[time] = mapped_column(Time, nullable=False)
    venue_name: Mapped[str] = mapped_column(String, nullable=False)
    venue_address: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    guests = relationship(
        "Guest", back_populates="event", cascade="all, delete-orphan"
    )