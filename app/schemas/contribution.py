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
    PAID = "paid"
    FAILED = "failed"


class ContributionCreate(BaseModel):
    guest_id: int
    amount: Decimal = Field(gt=0)
    payment_method: PaymentMethod
    transaction_reference: str | None = None


class ContributionPaymentUpdate(BaseModel):
    payment_method: PaymentMethod
    transaction_reference: str = Field(min_length=1, max_length=255)

    model_config = ConfigDict(str_strip_whitespace=True)


class ContributionResponse(BaseModel):
    id: int
    guest_id: int
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_reference: str | None
    paid_at: datetime | None
    rejection_reason: str | None = None
    rejected_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ContributionSummaryResponse(BaseModel):
    total_guests: int
    contributors: int
    total_expected: float
    total_paid: float
    total_pending: float


class ContributionConfirm(BaseModel):
    transaction_reference: str | None = None


class ContributionPaymentResponse(BaseModel):
    id: int
    guest_id: int
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_reference: str | None
    paid_at: datetime | None
    rejection_reason: str | None
    rejected_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ManualContributionCreate(BaseModel):
    guest_id: int
    amount: Decimal = Field(gt=0)
    payment_method: str
    transaction_reference: str | None = None


class ContributionListResponse(BaseModel):
    id: int
    guest_id: int
    guest_name: str
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_reference: str | None
    paid_at: datetime | None
    rejection_reason: str | None
    rejected_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class GuestContributionSummaryResponse(BaseModel):
    guest_id: int
    guest_name: str
    total_contributions: int
    total_paid: Decimal
    total_pending: Decimal
    contributions: list[ContributionListResponse]


class ContributionReject(BaseModel):
    rejection_reason: str


class ContributionRejectionResponse(BaseModel):
    id: int
    guest_id: int
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_reference: str | None
    paid_at: datetime | None
    rejection_reason: str | None
    rejected_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
