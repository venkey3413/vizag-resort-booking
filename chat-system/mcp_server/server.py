from mcp.server import Server
from mcp.types import Tool, TextContent
import requests
import re
import asyncio
import json

# Resort API configuration
RESORT_API_URL = "http://centralized-db-api:3003/api"

# Create MCP server
server = Server("resort-assistant")

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="check_resort_availability",
            description="Check if a resort is available on a specific date",
            inputSchema={
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Check-in date (YYYY-MM-DD)"},
                    "resort_name": {"type": "string", "description": "Name of the resort"}
                },
                "required": ["date", "resort_name"]
            }
        ),
        Tool(
            name="get_resort_list",
            description="Get list of all available resorts",
            inputSchema={"type": "object", "properties": {}}
        ),
        Tool(
            name="get_booking_info",
            description="Get booking information by booking ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "booking_id": {"type": "string", "description": "Booking ID to lookup"}
                },
                "required": ["booking_id"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "check_resort_availability":
        return await check_resort_availability(arguments["date"], arguments["resort_name"])
    elif name == "get_resort_list":
        return await get_resort_list()
    elif name == "get_booking_info":
        return await get_booking_info(arguments["booking_id"])
    else:
        raise ValueError(f"Unknown tool: {name}")

async def check_resort_availability(date: str, resort_name: str):
    try:
        # Get resorts and bookings
        resorts_response = requests.get(f"{RESORT_API_URL}/resorts")
        bookings_response = requests.get(f"{RESORT_API_URL}/bookings")
        
        if resorts_response.status_code == 200 and bookings_response.status_code == 200:
            resorts = resorts_response.json()
            bookings = bookings_response.json()
            
            # Find matching resort
            selected_resort = None
            for resort in resorts:
                if resort_name.lower() in resort['name'].lower():
                    selected_resort = resort
                    break
            
            if not selected_resort:
                return [TextContent(type="text", text=f"Resort '{resort_name}' not found. Available resorts: {', '.join([r['name'] for r in resorts[:3]])}")]
            
            # Check if resort is booked on that date
            is_booked = False
            for booking in bookings:
                if (booking.get('resort_id') == selected_resort['id'] and 
                    booking.get('check_in') <= date <= booking.get('check_out', date)):
                    is_booked = True
                    break
            
            if is_booked:
                return [TextContent(type="text", text=f"❌ {selected_resort['name']} is already booked on {date}. Please try a different date.")]
            else:
                return [TextContent(type="text", text=f"✅ {selected_resort['name']} is available on {date}! Price: ₹{selected_resort['price']}/night at {selected_resort['location']}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error checking availability: {str(e)}")]

async def get_resort_list():
    try:
        response = requests.get(f"{RESORT_API_URL}/resorts")
        if response.status_code == 200:
            resorts = response.json()
            resort_list = "\n".join([f"• {r['name']} - ₹{r['price']}/night at {r['location']}" for r in resorts])
            return [TextContent(type="text", text=f"Available resorts:\n{resort_list}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error fetching resorts: {str(e)}")]

async def get_booking_info(booking_id: str):
    try:
        response = requests.get(f"{RESORT_API_URL}/bookings")
        if response.status_code == 200:
            bookings = response.json()
            booking = next((b for b in bookings if str(b['id']) == booking_id), None)
            if booking:
                return [TextContent(type="text", text=f"Booking {booking_id}:\nGuest: {booking['guest_name']}\nResort: {booking.get('resort_name', 'N/A')}\nDates: {booking['check_in']} to {booking['check_out']}\nStatus: {booking.get('payment_status', 'pending')}")]
            else:
                return [TextContent(type="text", text=f"Booking {booking_id} not found")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error fetching booking: {str(e)}")]

async def main():
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())