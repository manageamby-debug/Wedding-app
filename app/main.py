from fastapi import FastAPI

from app.core.database import prepare_database
from app.routers import event

app = FastAPI()
app.include_router(event.router)
prepare_database()


@app.get("/")
def home():
    return {"message": "Hello Mchumba"}
