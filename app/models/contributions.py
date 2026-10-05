from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Contribution(Base):
    __tablename__ = "contributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    guest_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("guests.id"), nullable=False
    )
    guest = relationship("Guest", back_populates="contributions")

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String, nullable=False, default="pending"
    )
    transaction_reference: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
