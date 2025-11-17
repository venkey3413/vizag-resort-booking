import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Use SQLite by default; override with real DB via DATABASE_URL env var
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    return SessionLocal()

def check_resort_availability(db, resort_name: str, date: str, guests: int | None = None):
    """Example availability checker.

    This is a SAFE default implementation that always returns unknown.
    You should replace this logic with real SQL queries against your
    vizagresortbooking database (bookings + resorts tables).
    """
    return {
        "known": False,
        "available": None,
        "remaining": None,
        "reason": "Availability not wired to real DB yet."
    }