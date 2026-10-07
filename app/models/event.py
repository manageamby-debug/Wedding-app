from datetime import date, time
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column , relationship

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="events")

    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    couple_names: Mapped[str] = mapped_column(String(203), nullable=False, default="")
    groom_name: Mapped[str] = mapped_column(String, nullable=False)
    bride_name: Mapped[str] = mapped_column(String, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    event_time: Mapped[time] = mapped_column(Time, nullable=False)
    venue_name: Mapped[str] = mapped_column(String, nullable=False)
    venue_address: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    target_contribution: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0")
    )

    @property
    def venue(self) -> str:
        return self.venue_name

    guests = relationship(
        "Guest", back_populates="event", cascade="all, delete-orphan"
    )
