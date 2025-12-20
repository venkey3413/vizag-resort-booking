#!/usr/bin/env python3
import asyncio
import json
import sys
from mcp.server import Server
from mcp.types import Tool, TextContent, CallToolResult
import requests

BASE_URL = "http://centralized-db-api:3003"
server = Server("vizag-mcp-server")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(name="get_refund_policy", description="Get refund policy"),
        Tool(name="get_checkin_checkout_policy", description="Get check-in policy"),
        Tool(name="get_resort_rules", description="Get resort rules"),
        Tool(name="list_resorts", description="List resorts"),
        Tool(name="get_booking_status", description="Get booking status")
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_refund_policy":
        return [TextContent(type="text", text="**Refund Policy:**\n\n🔄 **Free Cancellation:** Full refund if cancelled 3+ days before check-in\n💰 **Mid-window:** 75% refund between 3 days and 24 hours before check-in\n❌ **Last 24 hours:** No refund within 24 hours of check-in")]
    
    elif name == "get_checkin_checkout_policy":
        return [TextContent(type="text", text="**Check-in/Check-out Policy:**\n\n🏨 **Check-in Time:** 11:00 AM onwards\n🚪 **Check-out Time:** 9:00 AM (strict)")]
    
    elif name == "get_resort_rules":
        return [TextContent(type="text", text="**Resort Rules:**\n\n🎵 **Music:** Allowed until 10:00 PM only\n🍕 **Outside Food:** Not permitted")]
    
    elif name == "list_resorts":
        try:
            response = requests.get(f"{BASE_URL}/api/resorts")
            if response.status_code == 200:
                resorts = response.json()
                result = "**Available Resorts:**\n\n"
                for resort in resorts[:3]:
                    result += f"🏨 **{resort.get('name', 'N/A')}**\n"
                return [TextContent(type="text", text=result)]
        except:
            pass
        return [TextContent(type="text", text="No resorts available")]
    
    elif name == "get_booking_status":
        booking_id = arguments.get("booking_id")
        return [TextContent(type="text", text=f"Booking {booking_id} status: Active")]
    
    raise ValueError(f"Unknown tool: {name}")

if __name__ == "__main__":
    import mcp.server.stdio
    mcp.server.stdio.run_server(server)