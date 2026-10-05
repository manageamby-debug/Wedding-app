from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RSVP(Base):
    __tablename__ = "rsvps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    guest_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("guests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    status: Mapped[str] = mapped_column(String, nullable=False)

    guest = relationship("Guest", back_populates="rsvp")
