from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./wedding.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autoflush=False,
    autocommit=False,
    bind=engine,
)

Base = declarative_base()


def prepare_database():
    """Create the current schema and safely handle the earlier empty events table."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "events" in inspector.get_table_names():
            columns = {
                column[1]
                for column in connection.exec_driver_sql("PRAGMA table_info(events)")
            }
            expected = {
                "id",
                "user_id",
                "groom_name",
                "bride_name",
                "event_date",
                "event_time",
                "venue_name",
                "venue_address",
                "status",
            }
            if not expected.issubset(columns):
                count = connection.exec_driver_sql(
                    "SELECT COUNT(*) FROM events"
                ).scalar_one()
                if count:
                    raise RuntimeError(
                        "The existing events table uses an older schema and contains "
                        "data. Back up wedding.db and migrate those records before "
                        "starting the app; no data was changed."
                    )
                if "events_legacy" in inspector.get_table_names():
                    raise RuntimeError(
                        "Both an incompatible events table and events_legacy already "
                        "exist. Rename or back up the legacy table before starting."
                    )
                connection.exec_driver_sql(
                    "ALTER TABLE events RENAME TO events_legacy"
                )

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

