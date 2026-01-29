#!/usr/bin/env python3

import asyncio
import websockets
import json
import requests

async def test_chat_system():
    print("🧪 Testing Chat System Connectivity")
    
    # Test 1: API endpoint
    try:
        response = requests.post("http://35.154.92.5:8000/api/chat", 
                               json={"session_id": "test_123", "message": "hello"})
        print(f"✅ API Test: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ API Test Failed: {e}")
    
    # Test 2: WebSocket connection
    try:
        uri = "ws://35.154.92.5:8000/dashboard/ws/user/test_123"
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket Connected")
            
            # Send test message
            await websocket.send(json.dumps({"message": "test from user"}))
            print("✅ Message sent")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✅ Received: {response}")
            except asyncio.TimeoutError:
                print("⚠️ No response received (timeout)")
                
    except Exception as e:
        print(f"❌ WebSocket Test Failed: {e}")
    
    # Test 3: Dashboard access
    try:
        response = requests.get("http://35.154.92.5:8000/dashboard/")
        print(f"✅ Dashboard Test: {response.status_code}")
    except Exception as e:
        print(f"❌ Dashboard Test Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat_system())