from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class PaymentMethod(str, Enum):
    MPESA = "mpesa"
    TIGOPESA = "tigopesa"
    AIRTEL_MONEY = "airtel_money"
    BANK = "bank"
    CASH = "cash"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class ContributionCreate(BaseModel):
    guest_id: int
    amount: Decimal = Field(gt=0)
    payment_method: PaymentMethod
    transaction_reference: str | None = None


class ContributionResponse(BaseModel):
    id: int
    guest_id: int
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_reference: str | None
    paid_at: datetime | None

    model_config = ConfigDict(from_attributes=True)