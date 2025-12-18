import asyncio
import json
import sys
from typing import Any, Dict, List
import requests
import re
from datetime import datetime

from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server import NotificationOptions, Server
import mcp.server.stdio

RESORT_API_URL = "http://centralized-db-api:3003/api"
session_data = {}

server = Server("resort-booking")

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    return [
        types.Tool(
            name="handle_chat",
            description="Handle all chat messages and provide appropriate responses",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "User message"},
                    "session_id": {"type": "string", "description": "Session ID"}
                },
                "required": ["message", "session_id"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    if name == "handle_chat":
        message = arguments["message"]
        session_id = arguments["session_id"]
        text = message.lower().strip()
        
        # 1. Human connection request
        if any(word in text for word in ["human", "agent", "support", "help me", "talk to someone"]):
            return [types.TextContent(type="text", text="👥 **Connecting you to our support team...**\n\nA human agent will assist you shortly. Please wait a moment.")]
        
        # 2. Resort selection (if in resort selection mode)
        if session_id in session_data and 'available_resorts' in session_data[session_id] and re.search(r'^\s*(\d+)\s*$', text):
            resort_number = int(text.strip())
            return [types.TextContent(type="text", text=await select_resort(resort_number, session_id))]
        
        # 3. Main menu selection (A, B, C, D)
        if re.search(r'^\s*[ABCDabcd]\s*$', text) and (session_id not in session_data or 'available_resorts' not in session_data[session_id]):
            option = text.upper()
            
            if option == "A":
                return [types.TextContent(type="text", text="📅 **Step 1: Check-in Date**\n\nPlease type your check-in date in format: **YYYY-MM-DD**\n\n**Example:** 2025-01-15\n\n📅 After you provide check-in date, I'll ask for check-out date.")]
            elif option == "B":
                return [types.TextContent(type="text", text="📋 **Booking Information**\n\nPlease provide your booking ID to get details.\n\n**Example:** Enter your booking reference like 'VE123456789'")]
            elif option == "C":
                return [types.TextContent(type="text", text="🔄 **Refund Policy:**\n\n✅ **Full refund** if cancelled 24+ hours before check-in\n🟡 **50% refund** if cancelled within 24 hours\n❌ **No refund** for no-shows\n\n📞 Need help with cancellation? Contact us:\n• Phone: +91 8341674465\n• Email: vizagresortbooking.com\n\nWould you like me to connect you to our support team?")]
            elif option == "D":
                return [types.TextContent(type="text", text="📞 **Contact Information:**\n\n📱 **Phone:** +91 8341674465\n📧 **Email:** vizagresortbooking.com\n🌐 **Website:** vizagresortbooking.in\n\n🕰️ **Business Hours:**\nMon-Sun: 9:00 AM - 9:00 PM\n\n💬 **Live Chat:** Available 24/7 (you're using it now!)\n\nHow else can I help you?")]
        
        # 4. Date input
        if re.search(r'^\s*(\d{4}-\d{2}-\d{2})\s*$', text):
            date = text.strip()
            
            # Validate date
            try:
                input_date = datetime.strptime(date, '%Y-%m-%d')
                today = datetime.utcnow()
                
                if input_date.date() < today.date():
                    return [types.TextContent(type="text", text="❌ **Past date not allowed!** Please enter a future date.\n\nExample: 2025-01-15")]
            except:
                return [types.TextContent(type="text", text="❌ **Invalid date format!** Please use YYYY-MM-DD format.\n\nExample: 2025-01-15")]
            
            # Check if this is check-in or check-out date
            if session_id not in session_data or 'check_in' not in session_data[session_id]:
                # This is check-in date
                session_data[session_id] = {'check_in': date}
                return [types.TextContent(type="text", text=f"✅ **Check-in Date:** {date}\n\n📅 **Step 2: Check-out Date**\n\nPlease type your check-out date in format: **YYYY-MM-DD**\n\n**Example:** 2025-01-17\n\n📝 Note: Check-out must be after {date}")]
            else:
                # This is check-out date
                check_in = session_data[session_id]['check_in']
                check_out = date
                
                # Validate check-out is after check-in
                try:
                    check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
                    check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
                    
                    if check_out_date <= check_in_date:
                        return [types.TextContent(type="text", text=f"❌ **Check-out date must be after {check_in}**\n\nPlease enter a valid check-out date:")]
                except:
                    return [types.TextContent(type="text", text="❌ **Invalid date!** Please enter check-out date in YYYY-MM-DD format.")]
                
                # Both dates collected, check availability
                result = await check_resort_availability(check_in, check_out, session_id)
                return [types.TextContent(type="text", text=result)]
        
        # 5. Greeting
        if any(word in text for word in ["hi", "hello", "hey", "good", "start"]):
            return [types.TextContent(type="text", text="Hi! I'm Keey, your resort booking assistant.\n\n🏨 **Please select an option:**\n\n**A.** 🏖️ Resort Availability\n**B.** 📋 Booking Information\n**C.** 💰 Refund Policies\n**D.** 📞 Contact Details\n\n**Type the letter (A, B, C, or D) to continue**\n\n👥 **Or type 'human' to connect with our support team**")]
        
        # Default response
        return [types.TextContent(type="text", text="🏨 **Welcome! I can help you with:**\n\n**A.** 🏖️ Resort Availability\n**B.** 📋 Booking Information\n**C.** 💰 Refund Policies\n**D.** 📞 Contact Details\n\n**Please select an option by typing the letter (A, B, C, or D)**\n\n👥 **Or type 'human' to connect with our support team**")]
    
    return [types.TextContent(type="text", text="Unknown tool")]

async def check_resort_availability(check_in: str, check_out: str, session_id: str) -> str:
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
            
            # Store in session
            session_data[session_id]['available_resorts'] = available_resorts
            session_data[session_id]['check_out'] = check_out
            
            if not available_resorts:
                return f"❌ **No resorts available ({check_in} to {check_out})**\n\nAll resorts are booked for these dates. Please try different dates."
            
            resort_options = []
            for i, resort in enumerate(available_resorts[:5]):
                resort_options.append(
                    f"**{i+1}. {resort['name']}** - 📍 {resort['location']} - 💰 ₹{resort['price']}/night"
                )
            
            return f"✅ **Available Resorts ({check_in} to {check_out}):**\n\n" + "\n\n".join(resort_options) + "\n\n🔢 **Select a resort by typing the option number (1, 2, 3, etc.)**"
    except Exception as e:
        print(f"Error checking availability: {e}")
        return "Sorry, I couldn't check availability right now. Please try again later."

async def select_resort(resort_number: int, session_id: str) -> str:
    if session_id not in session_data or 'available_resorts' not in session_data[session_id]:
        return "Session expired. Please start over by selecting option A for resort availability."
    
    available_resorts = session_data[session_id]['available_resorts']
    check_in = session_data[session_id]['check_in']
    check_out = session_data[session_id]['check_out']
    
    if resort_number < 1 or resort_number > len(available_resorts):
        return f"Please select a valid option (1-{len(available_resorts)})"
    
    selected_resort = available_resorts[resort_number - 1]
    
    # Calculate nights and total price
    check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
    check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
    nights = (check_out_date - check_in_date).days
    total_price = selected_resort['price'] * nights
    
    return f"✅ **{selected_resort['name']} - SELECTED**\n\n📍 **Location:** {selected_resort['location']}\n💰 **Price:** ₹{selected_resort['price']}/night\n📅 **Dates:** {check_in} to {check_out}\n🌙 **Nights:** {nights}\n💵 **Total Cost:** ₹{total_price:,}\n\n🔗 **[Book Now](/?resort={selected_resort['id']}&checkin={check_in}&checkout={check_out})**\n\nClick 'Book Now' to proceed with your reservation!\n\n👥 **Need help? Type 'human' to connect with support**"

async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="resort-booking",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())