from datetime import date

from pydantic import BaseModel


class DashboardEventInfo(BaseModel):
    id: int
    name: str
    event_date: date
    location: str | None


class DashboardGuestStats(BaseModel):
    total: int


class DashboardRSVPStats(BaseModel):
    attending: int
    not_attending: int
    maybe: int
    no_response: int


class DashboardCheckInStats(BaseModel):
    checked_in: int
    not_checked_in: int
    percentage: float


class DashboardContributionStats(BaseModel):
    contributors: int
    total_expected: float
    total_paid: float
    total_pending: float


class DashboardResponse(BaseModel):
    event: DashboardEventInfo
    guests: DashboardGuestStats
    rsvp: DashboardRSVPStats
    check_in: DashboardCheckInStats
    contributions: DashboardContributionStats
