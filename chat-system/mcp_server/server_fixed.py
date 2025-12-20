#!/usr/bin/env python3
import asyncio
import json
import sys
from mcp.server import Server
from mcp.types import Tool, TextContent
import requests

BASE_URL = "http://centralized-db-api:3003"

# Create server instance
server = Server("vizag-mcp-server")

# Define tools
@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_refund_policy",
            description="Get refund and cancellation policy information"
        ),
        Tool(
            name="get_checkin_checkout_policy", 
            description="Get check-in and check-out policy information"
        ),
        Tool(
            name="get_resort_rules",
            description="Get general resort rules and regulations"
        ),
        Tool(
            name="get_terms_conditions",
            description="Get terms and conditions"
        ),
        Tool(
            name="list_resorts",
            description="List available resorts"
        ),
        Tool(
            name="get_booking_status",
            description="Get booking status by ID"
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_refund_policy":
        return [TextContent(
            type="text",
            text="""**Refund Policy:**

🔄 **Free Cancellation:** Full refund if cancelled 3+ days before check-in
💰 **Mid-window:** 75% refund between 3 days and 24 hours before check-in  
❌ **Last 24 hours:** No refund within 24 hours of check-in
⏱️ **Processing:** Refunds processed in 3-5 business days
💳 **Price Changes:** Customer pays difference when rescheduling to higher tariff"""
        )]
    
    elif name == "get_checkin_checkout_policy":
        return [TextContent(
            type="text",
            text="""**Check-in/Check-out Policy:**

🏨 **Check-in Time:** 11:00 AM onwards
🚪 **Check-out Time:** 9:00 AM (strict)
📋 **Requirements:** Valid ID proof mandatory
🎒 **Early Arrival:** Subject to room availability
⏰ **Late Check-out:** Additional charges may apply"""
        )]
    
    elif name == "get_resort_rules":
        return [TextContent(
            type="text",
            text="""**Resort Rules:**

🎵 **Music:** Allowed until 10:00 PM only
🍕 **Outside Food:** Not permitted in resort premises
🏊 **Pool Hours:** 6:00 AM to 8:00 PM
🚭 **Smoking:** Designated areas only
👥 **Visitors:** Day visitors allowed with prior approval
🔇 **Noise:** Maintain silence after 10:00 PM"""
        )]
    
    elif name == "get_terms_conditions":
        return [TextContent(
            type="text",
            text="""**Terms & Conditions:**

📋 **Booking:** Advance payment required for confirmation
🆔 **ID Proof:** Mandatory at check-in
👨👩👧👦 **Occupancy:** Strictly as per booking details
💔 **Damage:** Guest liable for property damage
🚫 **Prohibited:** Illegal activities, pets (unless specified)
⚖️ **Disputes:** Subject to local jurisdiction"""
        )]
    
    elif name == "list_resorts":
        try:
            response = requests.get(f"{BASE_URL}/api/resorts")
            if response.status_code == 200:
                resorts = response.json()
                if resorts:
                    result = "**Available Resorts:**\n\n"
                    for resort in resorts[:5]:  # Show first 5
                        result += f"🏨 **{resort.get('name', 'N/A')}**\n"
                        result += f"📍 Location: {resort.get('location', 'N/A')}\n"
                        result += f"💰 Price: ₹{resort.get('price', 'N/A')}/night\n\n"
                    return [TextContent(type="text", text=result)]
            return [TextContent(type="text", text="No resorts available at the moment.")]
        except:
            return [TextContent(type="text", text="Unable to fetch resort information right now.")]
    
    elif name == "get_booking_status":
        booking_id = arguments.get("booking_id")
        try:
            response = requests.get(f"{BASE_URL}/api/bookings")
            if response.status_code == 200:
                bookings = response.json()
                for booking in bookings:
                    if str(booking.get('id')) == str(booking_id):
                        result = f"""**Booking Status for ID: {booking_id}**

👤 **Guest:** {booking.get('name', 'N/A')}
🏨 **Resort:** ID {booking.get('resortId', 'N/A')}
📅 **Check-in:** {booking.get('checkIn', 'N/A')}
📅 **Check-out:** {booking.get('checkOut', 'N/A')}
👥 **Guests:** {booking.get('guests', 'N/A')}
💳 **Payment:** {booking.get('paymentStatus', 'N/A')}
💰 **Amount:** ₹{booking.get('amountPaid', 'N/A')}
📊 **Status:** {booking.get('status', 'N/A')}"""
                        return [TextContent(type="text", text=result)]
            return [TextContent(type="text", text=f"Booking ID {booking_id} not found.")]
        except:
            return [TextContent(type="text", text="Unable to fetch booking information right now.")]
    
    else:
        raise ValueError(f"Unknown tool: {name}")

async def main():
    # Run the server
    async with server.run_stdio() as streams:
        await server.run()

if __name__ == "__main__":
    asyncio.run(main())