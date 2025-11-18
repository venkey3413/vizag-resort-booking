#!/usr/bin/env python3
"""
Test script to verify database connection and API endpoints
"""

from database_service import DatabaseService
import json

def test_database_service():
    print("Testing Database Service...")
    
    try:
        db_service = DatabaseService()
        
        # Test resorts
        print("\n1. Testing get_resorts():")
        resorts = db_service.get_resorts()
        print(f"Found {len(resorts)} resorts")
        if resorts:
            print(f"First resort: {resorts[0]['name']} - ₹{resorts[0]['price']}")
        
        # Test stats
        print("\n2. Testing get_stats():")
        stats = db_service.get_stats()
        print(f"Stats: {json.dumps(stats, indent=2)}")
        
        # Test food items
        print("\n3. Testing get_food_items():")
        food_items = db_service.get_food_items()
        print(f"Found {len(food_items)} food items")
        if food_items:
            print(f"First item: {food_items[0]['name']} - ₹{food_items[0]['price']}")
        
        # Test travel packages
        print("\n4. Testing get_travel_packages():")
        packages = db_service.get_travel_packages()
        print(f"Found {len(packages)} travel packages")
        if packages:
            print(f"First package: {packages[0]['name']} - ₹{packages[0]['price']}")
        
        # Test recent bookings
        print("\n5. Testing get_recent_bookings():")
        recent = db_service.get_recent_bookings(3)
        print(f"Found {len(recent)} recent bookings")
        for booking in recent:
            print(f"  - {booking['booking_reference']}: {booking['guest_name']} at {booking['resort_name']}")
        
        # Test availability check
        print("\n6. Testing check_availability():")
        availability = db_service.check_availability(1, "2024-12-25")
        print(f"Availability for resort 1 on 2024-12-25: {availability}")
        
        print("\n✅ All database tests passed!")
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_service()