from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    guest_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("guests.id"),
        nullable=False,
        unique=True,
    )

    invitation_code: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )

    short_code: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(
        String, default="active", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
