#!/usr/bin/env python3

import requests
import json
import time

def test_chat_api():
    """Test the chat API endpoint"""
    print("Testing Chat API...")
    
    base_url = "http://35.154.92.5:8000"
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        print(f"Health Check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health Check Failed: {e}")
        return False
    
    # Test 2: Chat API with MCP tools
    test_messages = [
        "What is your refund policy?",
        "Tell me about check-in",
        "What are the resort rules?",
        "Show me active coupons",
        "__HUMAN__"  # Human handover trigger
    ]
    
    session_id = f"test_{int(time.time())}"
    
    for message in test_messages:
        try:
            print(f"\nSending: {message}")
            response = requests.post(
                f"{base_url}/api/chat",
                json={"session_id": session_id, "message": message},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {data.get('answer', 'No answer')}")
                print(f"Handover: {data.get('handover', False)}")
            else:
                print(f"API Error: {response.status_code}")
                
        except Exception as e:
            print(f"Request Failed: {e}")
    
    # Test 3: Dashboard access
    try:
        response = requests.get(f"{base_url}/dashboard/", timeout=10)
        if response.status_code == 200:
            print(f"\nDashboard accessible: {response.status_code}")
        else:
            print(f"\nDashboard error: {response.status_code}")
    except Exception as e:
        print(f"\nDashboard test failed: {e}")
    
    # Test 4: Chat list API
    try:
        response = requests.get(f"{base_url}/dashboard/api/chats", timeout=10)
        if response.status_code == 200:
            chats = response.json()
            print(f"\nChat list: {len(chats)} active chats")
            if session_id in chats:
                print(f"Test session found in chat list")
            else:
                print(f"Test session not found in chat list")
        else:
            print(f"\nChat list error: {response.status_code}")
    except Exception as e:
        print(f"\nChat list test failed: {e}")
    
    return True

def main():
    print("Vizag Resort Chat System Test")
    print("=" * 40)
    
    if test_chat_api():
        print("\nChat system tests completed!")
        print("\nNext steps:")
        print("   1. Open http://35.154.92.5:8000/dashboard/ in your browser")
        print("   2. Test the chat widget on the main website")
        print("   3. Verify messages appear in the agent dashboard")
    else:
        print("\nChat system tests failed!")

if __name__ == "__main__":
    main()