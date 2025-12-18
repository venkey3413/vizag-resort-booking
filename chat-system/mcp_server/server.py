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
    
    # 1. Check for booking confirmation first
    if text.strip() in ["yes", "y", "ok", "okay", "proceed", "confirm"]:
        return {
            "response": "🎉 **Great! Let's proceed with your booking.**\n\nPlease click the link below to complete your reservation:\n\n🔗 **[Complete Booking](/)** \n\nYou'll be redirected to our booking page where you can:\n• Enter your guest details\n• Confirm dates and resort\n• Make secure payment\n• Receive instant confirmation",
            "handover": False
        }
    
    # 2. Check for refund/cancellation queries
    if any(word in text for word in ["refund", "cancel", "cancellation", "policy"]):
        return await handle_refund_policy(message)
    
    # 3. Check for booking information queries
    if any(word in text for word in ["booking", "reservation"]) and any(char.isdigit() for char in text):
        return await get_booking_info(message)
    
    # 4. Check for main menu selection (1, 2, 3)
    if re.search(r'^\s*[123]\s*$', text):
        return await handle_main_menu_selection(message, session_id)
    
    # 5. Check for resort selection (option 1, 2, 3, etc.) - only if in resort selection mode
    if session_id in session_data and 'available_resorts' in session_data[session_id] and re.search(r'^\s*(\d+)\s*$', text):
        return await handle_resort_selection(message, session_id)
    
    # 5. Check for single date input (check-in date)
    if re.search(r'^\s*(\d{4}-\d{2}-\d{2})\s*$', text):
        return await handle_single_date(message, session_id)
    
    # 6. Check for OLD STYLE availability queries (disable this)
    # if any(word in text for word in ["available", "availability", "resort", "check"]) and any(char.isdigit() for char in text):
    #     return await check_availability(message, session_id)
    
    # 6. Check for general resort availability request (no dates)
    if any(word in text for word in ["available", "availability", "check", "book"]) and not any(char.isdigit() for char in text):
        return await ask_for_dates()
    
    # 7. Check for general resort information
    if any(word in text for word in ["resort", "hotel", "accommodation"]) and not any(char.isdigit() for char in text):
        return await get_resort_list()
    
    # 6. Check for contact/help queries
    if any(word in text for word in ["contact", "help", "support", "phone", "email"]):
        return await get_contact_info()
    
    # 7. Check for greeting
    if any(word in text for word in ["hi", "hello", "hey", "good"]):
        return {
            "response": "Hi! I'm Keey, your resort booking assistant. I can help you with:\n\n• 🏨 Resort availability\n• 💰 Booking information\n• 🔄 Refund policies\n• 📞 Contact details\n\nHow can I assist you today?",
            "handover": False
        }
    
    # Default response with menu options
    return {
        "response": "🏨 **Welcome! I can help you with:**\n\n**1.** 🏖️ Resort Availability\n**2.** 📋 Booking Information\n**3.** 💰 Refund Policies\n\n**Please select an option by typing the number (1, 2, or 3)**",
        "handover": False
    }

# Store session data (in production, use Redis or database)
session_data = {}

async def ask_for_dates():
    return {
        "response": "📅 **Step 1: Check-in Date**\n\nPlease type your check-in date in format: **YYYY-MM-DD**\n\n**Example:** 2024-12-25\n\n📅 After you provide check-in date, I'll ask for check-out date.",
        "handover": False
    }

async def handle_main_menu_selection(message: str, session_id: str):
    option = message.strip()
    
    if option == "1":
        return await ask_for_dates()
    elif option == "2":
        return {
            "response": "📋 **Booking Information**\n\nPlease provide your booking ID to get details.\n\n**Example:** Enter your booking reference like 'VE123456789'",
            "handover": False
        }
    elif option == "3":
        return await handle_refund_policy("")
    else:
        return {
            "response": "Please select a valid option (1, 2, or 3):\n\n**1.** Resort Availability\n**2.** Booking Information\n**3.** Refund Policies",
            "handover": False
        }

async def handle_single_date(message: str, session_id: str):
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', message)
    if not date_match:
        return {
            "response": "Please enter date in YYYY-MM-DD format. Example: 2024-12-25",
            "handover": False
        }
    
    date = date_match.group(1)
    
    # Validate date
    try:
        from datetime import datetime
        input_date = datetime.strptime(date, '%Y-%m-%d')
        today = datetime.now()
        
        if input_date.date() < today.date():
            return {
                "response": "❌ **Past date not allowed!** Please enter a future date.\n\nExample: 2024-12-25",
                "handover": False
            }
    except:
        return {
            "response": "❌ **Invalid date format!** Please use YYYY-MM-DD format.\n\nExample: 2024-12-25",
            "handover": False
        }
    
    # Check if this is check-in or check-out date
    if session_id not in session_data or 'check_in' not in session_data[session_id]:
        # This is check-in date
        session_data[session_id] = {'check_in': date}
        return {
            "response": f"✅ **Check-in Date:** {date}\n\n📅 **Step 2: Check-out Date**\n\nPlease type your check-out date in format: **YYYY-MM-DD**\n\n**Example:** 2024-12-27\n\n📝 Note: Check-out must be after {date}",
            "handover": False
        }
    else:
        # This is check-out date
        check_in = session_data[session_id]['check_in']
        check_out = date
        
        # Validate check-out is after check-in
        try:
            check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
            check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
            
            if check_out_date <= check_in_date:
                return {
                    "response": f"❌ **Check-out date must be after {check_in}**\n\nPlease enter a valid check-out date:",
                    "handover": False
                }
        except:
            return {
                "response": "❌ **Invalid date!** Please enter check-out date in YYYY-MM-DD format.",
                "handover": False
            }
        
        # Both dates collected, show available resorts
        session_data[session_id]['check_out'] = check_out
        return await show_available_resorts(session_id)

async def show_available_resorts(session_id: str):
    check_in = session_data[session_id]['check_in']
    check_out = session_data[session_id]['check_out']
    
    try:
        resorts_response = requests.get(f"{RESORT_API_URL}/resorts")
        bookings_response = requests.get(f"{RESORT_API_URL}/bookings")
        
        if resorts_response.status_code == 200 and bookings_response.status_code == 200:
            resorts = resorts_response.json()
            bookings = bookings_response.json()
            
            # Find available resorts
            available_resorts = []
            for resort in resorts:
                is_booked = False
                for booking in bookings:
                    if (booking.get('resort_id') == resort['id'] and 
                        not (booking.get('check_out') <= check_in or booking.get('check_in') >= check_out)):
                        is_booked = True
                        break
                
                if not is_booked:
                    available_resorts.append(resort)
            
            if not available_resorts:
                return {
                    "response": f"❌ **No resorts available ({check_in} to {check_out})**\n\nAll resorts are booked for these dates. Please try different dates.",
                    "handover": False
                }
            
            # Store available resorts
            session_data[session_id]['available_resorts'] = available_resorts
            
            resort_options = []
            for i, resort in enumerate(available_resorts[:5]):
                resort_options.append(
                    f"**{i+1}. {resort['name']}** - 📍 {resort['location']} - 💰 ₹{resort['price']}/night"
                )
            
            return {
                "response": f"✅ **Available Resorts ({check_in} to {check_out}):**\n\n" + "\n\n".join(resort_options) + "\n\n🔢 **Select a resort by typing the option number (1, 2, 3, etc.)**",
                "handover": False
            }
    except:
        return {
            "response": "Sorry, I couldn't check availability right now. Please try again later.",
            "handover": False
        }

async def handle_resort_selection(message: str, session_id: str):
    # Extract option number
    option_match = re.search(r'\b(option|select|choose)\s*(\d+)\b', message.lower()) or re.search(r'^\s*(\d+)\s*$', message)
    if not option_match:
        return {
            "response": "Please select a resort by typing the option number (1, 2, 3, etc.)",
            "handover": False
        }
    
    option_num = int(option_match.group(2) if option_match.group(1) else option_match.group(1))
    
    # Get stored session data
    if session_id not in session_data or 'available_resorts' not in session_data[session_id]:
        return {
            "response": "Please first check availability by providing your check-in and check-out dates.",
            "handover": False
        }
    
    available_resorts = session_data[session_id]['available_resorts']
    check_in = session_data[session_id]['check_in']
    check_out = session_data[session_id]['check_out']
    
    if option_num < 1 or option_num > len(available_resorts):
        return {
            "response": f"Please select a valid option (1-{len(available_resorts)})",
            "handover": False
        }
    
    selected_resort = available_resorts[option_num - 1]
    
    # Calculate nights and total price
    from datetime import datetime
    check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
    check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
    nights = (check_out_date - check_in_date).days
    total_price = selected_resort['price'] * nights
    
    return {
        "response": f"✅ **{selected_resort['name']} - SELECTED**\n\n📍 **Location:** {selected_resort['location']}\n💰 **Price:** ₹{selected_resort['price']}/night\n📅 **Dates:** {check_in} to {check_out}\n🌙 **Nights:** {nights}\n💵 **Total Cost:** ₹{total_price:,}\n\n🔗 **[Book Now](/?resort={selected_resort['id']}&checkin={check_in}&checkout={check_out})**\n\nClick 'Book Now' to proceed with your reservation!",
        "handover": False
    }

async def check_availability(message: str, session_id: str):
    text = message.lower()
    
    # Look for date patterns - find both check-in and check-out
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2})'
    ]
    
    found_dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, message)
        found_dates.extend(matches)
    
    if len(found_dates) < 2:
        return {
            "response": "📅 **Please provide both dates:**\n\n🔹 **Check-in Date** (YYYY-MM-DD)\n🔹 **Check-out Date** (YYYY-MM-DD)\n\n**Example:** \n'Check availability from 2024-12-25 to 2024-12-27'\n\nI need both dates to show you available resorts.",
            "handover": False
        }
    
    check_in = found_dates[0]
    check_out = found_dates[1]
    
    # Validate dates
    try:
        from datetime import datetime
        check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
        check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
        
        if check_out_date <= check_in_date:
            return {
                "response": "❌ **Invalid dates!** Check-out date must be after check-in date.\n\nPlease provide valid dates.",
                "handover": False
            }
    except:
        return {
            "response": "❌ **Invalid date format!** Please use YYYY-MM-DD format.\n\nExample: 2024-12-25",
            "handover": False
        }
    
    # Check availability with date
    try:
        resorts_response = requests.get(f"{RESORT_API_URL}/resorts")
        bookings_response = requests.get(f"{RESORT_API_URL}/bookings")
        
        if resorts_response.status_code == 200 and bookings_response.status_code == 200:
            resorts = resorts_response.json()
            bookings = bookings_response.json()
            
            # Find matching resort with flexible matching
            selected_resort = None
            for resort in resorts:
                resort_name_words = resort['name'].lower().split()
                text_words = text.split()
                
                # Check if any word from resort name is in the message
                if any(word in text for word in resort_name_words) or resort['name'].lower() in text:
                    selected_resort = resort
                    break
                
                # Check for partial matches (e.g., "royal" matches "Royal Orchid")
                for text_word in text_words:
                    if len(text_word) > 3:  # Only check words longer than 3 characters
                        for resort_word in resort_name_words:
                            if text_word in resort_word or resort_word in text_word:
                                selected_resort = resort
                                break
                    if selected_resort:
                        break
                if selected_resort:
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
                        "response": f"❌ **No resorts available ({check_in} to {check_out})**\n\nAll resorts are booked for these dates. Please try different dates.",
                        "handover": False
                    }
                
                # Store session data for resort selection
                session_data[session_id] = {
                    'available_resorts': available_resorts,
                    'check_in': check_in,
                    'check_out': check_out
                }
                
                resort_options = []
                for i, resort in enumerate(available_resorts[:5]):
                    resort_options.append(
                        f"**{i+1}. {resort['name']}** - 📍 {resort['location']} - 💰 ₹{resort['price']}/night"
                    )
                
                return {
                    "response": f"✅ **Available Resorts ({check_in} to {check_out}):**\n\n" + "\n\n".join(resort_options) + "\n\n🔢 **Select a resort by typing the option number (1, 2, 3, etc.)**",
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
                # Calculate nights and total price
                nights = (check_out_date - check_in_date).days
                total_price = selected_resort['price'] * nights
                
                return {
                    "response": f"✅ **{selected_resort['name']}** is available!\n\n📍 **Location:** {selected_resort['location']}\n💰 **Price:** ₹{selected_resort['price']}/night\n📅 **Dates:** {check_in} to {check_out}\n🌙 **Nights:** {nights}\n💵 **Total Cost:** ₹{total_price:,}\n\n🔗 **[Book Now](/?resort={selected_resort['id']}&checkin={check_in}&checkout={check_out})**\n\nClick 'Book Now' to proceed with your reservation!",
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

async def handle_refund_policy(message: str):
    return {
        "response": "🔄 **Refund Policy:**\n\n✅ **Full refund** if cancelled 24+ hours before check-in\n🟡 **50% refund** if cancelled within 24 hours\n❌ **No refund** for no-shows\n\n📞 Need help with cancellation? Contact us:\n• Phone: +91 9876543210\n• Email: support@vizagresorts.com\n\nWould you like me to connect you to our support team?",
        "handover": False
    }

async def get_resort_list():
    try:
        response = requests.get(f"{RESORT_API_URL}/resorts")
        if response.status_code == 200:
            resorts = response.json()
            resort_list = []
            for i, resort in enumerate(resorts[:5]):
                resort_list.append(f"**{i+1}. {resort['name']}** - 📍 {resort['location']} - 💰 ₹{resort['price']}/night")
            
            return {
                "response": f"🏨 **Our Resorts:**\n\n" + "\n\n".join(resort_list) + "\n\nTo check availability, please provide your check-in date (YYYY-MM-DD).",
                "handover": False
            }
    except:
        pass
    
    return {
        "response": "Sorry, I couldn't fetch resort information right now. Please try again later.",
        "handover": False
    }

async def get_contact_info():
    return {
        "response": "📞 **Contact Information:**\n\n📱 **Phone:** +91 9876543210\n📧 **Email:** support@vizagresorts.com\n🌐 **Website:** vizagresortbooking.in\n\n🕰️ **Business Hours:**\nMon-Sun: 9:00 AM - 9:00 PM\n\n💬 **Live Chat:** Available 24/7 (you're using it now!)\n\nHow else can I help you?",
        "handover": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3004)