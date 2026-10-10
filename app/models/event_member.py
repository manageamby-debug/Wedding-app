from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventMember(Base):
    __tablename__ = "event_members"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[str] = mapped_column(String(30), nullable=False, default="member")

    event = relationship("Event", back_populates="members")
    user = relationship("User", back_populates="event_memberships")
