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
    """Check real resort availability from database"""
    try:
        # Get resort info
        resort_query = text("SELECT id, name FROM resorts WHERE name LIKE :name AND available = 1")
        resort_result = db.execute(resort_query, {"name": f"%{resort_name}%"}).fetchone()
        
        if not resort_result:
            return {
                "known": False,
                "available": None,
                "remaining": None,
                "reason": f"Resort '{resort_name}' not found or not available."
            }
        
        resort_id = resort_result[0]
        
        # Check bookings for the date
        booking_query = text("""
            SELECT COUNT(*) as booked_count, SUM(guests) as total_guests
            FROM bookings 
            WHERE resort_id = :resort_id 
            AND check_in <= :date 
            AND check_out > :date
            AND status != 'cancelled'
        """)
        
        booking_result = db.execute(booking_query, {
            "resort_id": resort_id,
            "date": date
        }).fetchone()
        
        booked_guests = booking_result[1] or 0
        max_capacity = 100  # Default capacity, should be in resorts table
        
        available = booked_guests < max_capacity
        remaining = max_capacity - booked_guests if available else 0
        
        return {
            "known": True,
            "available": available,
            "remaining": remaining,
            "reason": f"Current bookings: {booked_guests}/{max_capacity} guests"
        }
        
    except Exception as e:
        return {
            "known": False,
            "available": None,
            "remaining": None,
            "reason": f"Database error: {str(e)}"
        }