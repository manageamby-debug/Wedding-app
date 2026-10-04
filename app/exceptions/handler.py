from typing import cast

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


async def database_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "A database error occurred"},
    )


async def http_exception_handler(request: Request, exc: Exception):
    http_exc = cast(StarletteHTTPException, exc)
    return JSONResponse(
        status_code=http_exc.status_code,
        content={"success": False, "message": http_exc.detail},
    )


async def validation_exception_handler(request: Request, exc: Exception):
    validation_exc = cast(RequestValidationError, exc)
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "errors": jsonable_encoder(validation_exc.errors()),
        },
    )
