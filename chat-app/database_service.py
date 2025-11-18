import sqlite3
import json
from typing import List, Dict, Optional
from datetime import datetime

class DatabaseService:
    def __init__(self, db_path: str = "../resort_booking.db"):
        self.db_path = db_path
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def get_resorts(self) -> List[Dict]:
        """Get all available resorts"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, location, price, description, image, 
                       amenities, note, max_guests
                FROM resorts 
                WHERE available = 1 
                ORDER BY sort_order ASC, id ASC
            """)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_booking(self, reference: str) -> Optional[Dict]:
        """Get booking by reference or ID"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.*, r.name as resort_name
                FROM bookings b 
                JOIN resorts r ON b.resort_id = r.id 
                WHERE b.booking_reference = ? OR b.id = ?
            """, (reference, reference))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_food_order(self, order_id: str) -> Optional[Dict]:
        """Get food order by order ID"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM food_orders WHERE order_id = ?", (order_id,))
            row = cursor.fetchone()
            if row:
                order = dict(row)
                if order.get('items'):
                    order['items'] = json.loads(order['items'])
                return order
            return None
    
    def get_travel_booking(self, reference: str) -> Optional[Dict]:
        """Get travel booking by reference or ID"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM travel_bookings 
                WHERE booking_reference = ? OR id = ?
            """, (reference, reference))
            row = cursor.fetchone()
            if row:
                booking = dict(row)
                if booking.get('packages'):
                    booking['packages'] = json.loads(booking['packages'])
                return booking
            return None
    
    def get_food_items(self) -> List[Dict]:
        """Get all food items"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM food_items ORDER BY category, name")
            return [dict(row) for row in cursor.fetchall()]
    
    def get_travel_packages(self) -> List[Dict]:
        """Get all travel packages"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM travel_packages ORDER BY name")
            return [dict(row) for row in cursor.fetchall()]
    
    def check_availability(self, resort_id: int, date: str) -> Dict:
        """Check resort availability for a specific date"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check for blocked dates
            cursor.execute("""
                SELECT 1 FROM resort_availability 
                WHERE resort_id = ? AND blocked_date = ?
            """, (resort_id, date))
            if cursor.fetchone():
                return {"available": False, "reason": "Date blocked by resort owner"}
            
            # Check for existing paid bookings
            cursor.execute("""
                SELECT 1 FROM bookings 
                WHERE resort_id = ? AND payment_status = 'paid' 
                AND check_in <= ? AND check_out > ?
            """, (resort_id, date, date))
            if cursor.fetchone():
                return {"available": False, "reason": "Already booked"}
            
            return {"available": True}
    
    def get_stats(self) -> Dict:
        """Get system statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM resorts WHERE available = 1")
            total_resorts = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM bookings WHERE payment_status = 'paid'")
            total_bookings = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM food_orders WHERE status = 'confirmed'")
            total_food_orders = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM travel_bookings WHERE status = 'confirmed'")
            total_travel_bookings = cursor.fetchone()[0]
            
            return {
                "totalResorts": total_resorts,
                "totalBookings": total_bookings,
                "totalFoodOrders": total_food_orders,
                "totalTravelBookings": total_travel_bookings
            }
    
    def get_recent_bookings(self, limit: int = 5) -> List[Dict]:
        """Get recent confirmed bookings"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.booking_reference, b.guest_name, r.name as resort_name, 
                       b.check_in, b.total_price, b.booking_date
                FROM bookings b 
                JOIN resorts r ON b.resort_id = r.id 
                WHERE b.payment_status = 'paid'
                ORDER BY b.booking_date DESC 
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def search_bookings(self, query: str) -> List[Dict]:
        """Search bookings by reference, name, or phone"""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.*, r.name as resort_name
                FROM bookings b 
                JOIN resorts r ON b.resort_id = r.id 
                WHERE b.booking_reference LIKE ? 
                   OR b.guest_name LIKE ? 
                   OR b.phone LIKE ?
                   OR b.email LIKE ?
                ORDER BY b.booking_date DESC
                LIMIT 10
            """, (f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%"))
            return [dict(row) for row in cursor.fetchall()]