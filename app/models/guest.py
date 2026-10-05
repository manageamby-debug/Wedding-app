from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id"),
        nullable=False
    )

    event = relationship("Event", back_populates="guests")

    full_name: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    phone: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    email: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    guest_code: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True
    )

    check_in_status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="pending"
    )

    contributions = relationship(
        "Contribution",
        back_populates="guest",
        cascade="all, delete-orphan"
    )

    rsvp = relationship(
        "RSVP",
        back_populates="guest",
        uselist=False,
        cascade="all, delete-orphan"
    )