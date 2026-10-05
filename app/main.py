from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.database import prepare_database
from app.exceptions.handler import (
    database_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.models import contributions as contributions_model  # noqa: F401  (registers the table)
from app.models import event as event_model  # noqa: F401  (registers the table)
from app.models import guest as guest_model  # noqa: F401  (registers the table)
from app.models import user as user_model  # noqa: F401  (registers the table)
from app.models import payment_audit as payment_audit_model  # noqa: F401 (registers the table)
from app.routers import checkin, contribution, dashboard, event, guest, invitation, payment_audit, rsvp, user
from fastapi.middleware.cors import CORSMiddleware

prepare_database()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)

app.include_router(event.router)
app.include_router(user.router)
app.include_router(guest.router)
app.include_router(contribution.router)
app.include_router(invitation.router)
app.include_router(rsvp.router)
app.include_router(checkin.router)
app.include_router(dashboard.router)
app.include_router(payment_audit.router)
