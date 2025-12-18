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
        return {
            "response": "📅 **Please provide your check-in date**\n\nFormat: YYYY-MM-DD\nExample: 2024-12-25\n\nOnce you provide the date, I'll show you all available resorts for that day.",
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
                # Show all available resorts for the date with booking options
                available_resorts = []
                for resort in resorts:
                    # Check if this resort is available on the date
                    is_booked = False
                    for booking in bookings:
                        if (booking.get('resort_id') == resort['id'] and 
                            booking.get('check_in') <= found_date <= booking.get('check_out', found_date)):
                            is_booked = True
                            break
                    
                    if not is_booked:
                        available_resorts.append(resort)
                
                if not available_resorts:
                    return {
                        "response": f"❌ **No resorts available on {found_date}**\n\nAll resorts are booked for this date. Please try a different date.",
                        "handover": False
                    }
                
                resort_options = []
                for i, resort in enumerate(available_resorts[:5]):
                    resort_options.append(
                        f"**{i+1}. {resort['name']}**\n"
                        f"📍 Location: {resort['location']}\n"
                        f"💰 Price: ₹{resort['price']}/night\n"
                        f"🔗 [Book Now](/?resort={resort['id']}&date={found_date})\n"
                    )
                
                return {
                    "response": f"✅ **Available Resorts for {found_date}:**\n\n" + "\n".join(resort_options) + "\n\nClick 'Book Now' to proceed with your reservation!",
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
                    "response": f"✅ **{selected_resort['name']}** is available on {found_date}!\n\n💰 **Price:** ₹{selected_resort['price']}/night\n📍 **Location:** {selected_resort['location']}\n\n🔗 **[Book Now](/?resort={selected_resort['id']}&date={found_date})**\n\nClick the link above to proceed with your reservation!",
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