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
from app.models import event as event_model  # noqa: F401  (registers the table)
from app.models import user as user_model  # noqa: F401  (registers the table)
from app.routers import event, user


prepare_database()

app = FastAPI()

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)

app.include_router(event.router)
app.include_router(user.router)
