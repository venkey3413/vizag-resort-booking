from fastapi import FastAPI
import requests
import re
from datetime import datetime

app = FastAPI()

RESORT_API_URL = "http://centralized-db-api:3003/api"

@app.post("/chat")
async def handle_chat(request: dict):
    message = request.get("message", "")
    session_id = request.get("session_id", "")
    text = message.lower()
    
    # Check for resort availability queries
    if any(word in text for word in ["available", "availability", "book", "resort"]):
        return await check_availability(message)
    
    # Check for booking queries
    if "booking" in text:
        return await get_booking_info(message)
    
    # Default response
    return {
        "response": "I can help you with resort availability, booking information, and refund policies. How can I assist you?",
        "handover": False
    }

async def check_availability(message: str):
    text = message.lower()
    
    # Look for date patterns
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2})'
    ]
    
    found_date = None
    for pattern in date_patterns:
        match = re.search(pattern, message)
        if match:
            found_date = match.group(1)
            break
    
    if not found_date:
        try:
            response = requests.get(f"{RESORT_API_URL}/resorts")
            if response.status_code == 200:
                resorts = response.json()
                resort_list = "\n".join([f"{i+1}. {r['name']} - {r['location']}" for i, r in enumerate(resorts[:5])])
                return {
                    "response": f"To check availability, please provide:\n\n📅 **Check-in Date** (YYYY-MM-DD format)\n🏨 **Resort Name**\n\nAvailable resorts:\n{resort_list}\n\nExample: 'Check availability for Sample Resort on 2024-12-25'",
                    "handover": False
                }
        except:
            pass
        return {
            "response": "Please provide the check-in date (YYYY-MM-DD) and resort name to check availability.",
            "handover": False
        }
    
    # Check availability with date
    try:
        resorts_response = requests.get(f"{RESORT_API_URL}/resorts")
        bookings_response = requests.get(f"{RESORT_API_URL}/bookings")
        
        if resorts_response.status_code == 200 and bookings_response.status_code == 200:
            resorts = resorts_response.json()
            bookings = bookings_response.json()
            
            # Find matching resort
            selected_resort = None
            for resort in resorts:
                if resort['name'].lower() in text:
                    selected_resort = resort
                    break
            
            if not selected_resort:
                resort_list = "\n".join([f"{i+1}. {r['name']} - {r['location']}" for i, r in enumerate(resorts[:5])])
                return {
                    "response": f"Please specify which resort you'd like to check for {found_date}:\n\n{resort_list}",
                    "handover": False
                }
            
            # Check if resort is booked on that date
            is_booked = False
            for booking in bookings:
                if (booking.get('resort_id') == selected_resort['id'] and 
                    booking.get('check_in') <= found_date <= booking.get('check_out', found_date)):
                    is_booked = True
                    break
            
            if is_booked:
                return {
                    "response": f"❌ **{selected_resort['name']}** is already booked on {found_date}.\n\nPlease try a different date or resort.",
                    "handover": False
                }
            else:
                return {
                    "response": f"✅ **{selected_resort['name']}** is available on {found_date}!\n\n💰 **Price:** ₹{selected_resort['price']}/night\n📍 **Location:** {selected_resort['location']}\n\nWould you like to proceed with booking?",
                    "handover": False
                }
    except Exception as e:
        return {
            "response": "Sorry, I couldn't check availability right now. Please try again later.",
            "handover": False
        }

async def get_booking_info(message: str):
    match = re.search(r"(\d{3,10})", message)
    booking_id = match.group(1) if match else None
    
    if booking_id:
        try:
            response = requests.get(f"{RESORT_API_URL}/bookings")
            if response.status_code == 200:
                bookings = response.json()
                booking = next((b for b in bookings if str(b['id']) == booking_id), None)
                if booking:
                    return {
                        "response": f"Booking {booking_id}:\nGuest: {booking['guest_name']}\nResort: {booking.get('resort_name', 'N/A')}\nDates: {booking['check_in']} to {booking['check_out']}\nStatus: {booking.get('payment_status', 'pending')}",
                        "handover": False
                    }
        except:
            pass
    
    return {
        "response": "Please provide a valid booking ID to get booking information.",
        "handover": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3004)