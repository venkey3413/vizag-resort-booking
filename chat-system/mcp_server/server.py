
from mcp.server import Server
from mcp.server.types import TextContent
import requests

BASE_URL = "http://centralized-db-api:3003"
server = Server("vizag-mcp-server")

@server.tool(name="get_refund_policy", description="Refund policy")
def get_refund_policy():
    return TextContent(type="text", text="Refunds allowed based on cancellation window.")

@server.tool(name="get_checkin_checkout_policy", description="Check-in/out timings")
def get_checkin_checkout_policy():
    return TextContent(type="text", text="Check-in 11 AM, Check-out 9 AM.")

@server.tool(name="get_terms_conditions", description="Full T&C")
def get_terms_conditions():
    return TextContent(type="text", text="Guests must follow all property rules.")

@server.tool(name="get_resort_rules", description="General resort rules")
def get_resort_rules():
    return TextContent(type="text", text="Music allowed until 10 PM, outside food not allowed.")

@server.tool(name="get_free_cancellation_policy", description="Free cancellation rules")
def get_free_cancellation_policy():
    return TextContent(type="text", text="Full refund if cancelled 3 days before check-in.")

@server.tool(name="get_mid_window_cancellation_policy", description="Mid-window cancellation")
def get_mid_window_cancellation_policy():
    return TextContent(type="text", text="75% refund between 3 days and 24 hours.")

@server.tool(name="get_last_24h_cancellation_policy", description="Last 24 hours cancellation")
def get_last_24h_cancellation_policy():
    return TextContent(type="text", text="No refund within 24 hours.")

@server.tool(name="get_price_difference_policy", description="Price difference rule")
def get_price_difference_policy():
    return TextContent(type="text", text="Customer must pay tariff difference when rescheduling.")

@server.tool(name="get_general_refund_terms", description="General refund info")
def get_general_refund_terms():
    return TextContent(type="text", text="Refunds processed in 3-5 business days.")

# ===========================
# REAL-TIME API TOOLS
# ===========================

@server.tool(name="list_resorts")
def list_resorts():
    r = requests.get(f"{BASE_URL}/api/resorts")
    return TextContent(type="text", text=r.text)

@server.tool(name="get_resort_by_id")
def get_resort_by_id(resort_id: str):
    r = requests.get(f"{BASE_URL}/api/resorts/{resort_id}")
    return TextContent(type="text", text=r.text)

@server.tool(name="list_bookings")
def list_bookings():
    r = requests.get(f"{BASE_URL}/api/bookings")
    return TextContent(type="text", text=r.text)

@server.tool(name="get_booking_status")
def get_booking_status(booking_id: str):
    r = requests.get(f"{BASE_URL}/api/bookings")
    bookings = r.json()
    for b in bookings:
        if str(b.get("id")) == str(booking_id):
            return TextContent(type="text", text=str(b))
    return TextContent(type="text", text="Booking not found.")

@server.tool(name="create_booking")
def create_booking(data: dict):
    r = requests.post(f"{BASE_URL}/api/bookings", json=data)
    return TextContent(type="text", text=r.text)

@server.tool(name="update_booking")
def update_booking(booking_id: str, data: dict):
    r = requests.put(f"{BASE_URL}/api/bookings/{booking_id}", json=data)
    return TextContent(type="text", text=r.text)

@server.tool(name="create_food_order")
def create_food_order(data: dict):
    r = requests.post(f"{BASE_URL}/api/food-orders", json=data)
    return TextContent(type="text", text=r.text)

@server.tool(name="create_travel_booking")
def create_travel_booking(data: dict):
    r = requests.post(f"{BASE_URL}/api/travel-bookings", json=data)
    return TextContent(type="text", text=r.text)

@server.tool(name="get_blocked_dates_for_resort")
def get_blocked_dates_for_resort(resort_id: str):
    r = requests.get(f"{BASE_URL}/api/blocked-dates/{resort_id}")
    return TextContent(type="text", text=r.text)

@server.tool(name="central_api_health")
def central_api_health():
    r = requests.get(f"{BASE_URL}/health")
    return TextContent(type="text", text=r.text)

@server.tool(name="get_full_booking_summary")
def get_full_booking_summary(booking_id: str):
    r = requests.get(f"{BASE_URL}/api/bookings")
    bookings = r.json()
    booking = next((b for b in bookings if str(b.get("id")) == str(booking_id)), None)
    if not booking:
        return TextContent(type="text", text="No booking found.")
    summary = f"""
Booking Summary:
Name: {booking.get('name')}
Resort ID: {booking.get('resortId')}
Check-in: {booking.get('checkIn')}
Check-out: {booking.get('checkOut')}
Guests: {booking.get('guests')}
Payment Status: {booking.get('paymentStatus')}
Amount Paid: {booking.get('amountPaid')}
Status: {booking.get('status')}
"""
    return TextContent(type="text", text=summary)

def main():
    server.run()

if __name__ == "__main__":
    main()
