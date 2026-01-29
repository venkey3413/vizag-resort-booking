#!/usr/bin/env python3

import subprocess
import sys
import time
import requests

def install_requirements():
    """Install required packages"""
    print("📦 Installing requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False
    return True

def start_redis():
    """Start Redis server (if available)"""
    print("🔴 Starting Redis...")
    try:
        # Try to start Redis (this might not work on all systems)
        subprocess.Popen(["redis-server", "--port", "6379"], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL)
        time.sleep(2)
        print("✅ Redis started")
    except FileNotFoundError:
        print("⚠️ Redis not found - using fallback mode")
    return True

def start_chat_server():
    """Start the chat server"""
    print("🚀 Starting chat server...")
    try:
        # Start the server
        subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", 
                         "--host", "0.0.0.0", "--port", "8000", "--reload"])
        time.sleep(3)
        
        # Test if server is running
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Chat server started successfully")
            print("🌐 Dashboard: http://localhost:8000/dashboard/")
            print("🔗 API: http://localhost:8000/api/chat")
            return True
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False

def main():
    print("🎯 Vizag Resort Chat System Startup")
    print("=" * 40)
    
    if not install_requirements():
        return
    
    if not start_redis():
        return
    
    if not start_chat_server():
        return
    
    print("\n✅ Chat system is running!")
    print("\n📋 Test URLs:")
    print("   Dashboard: http://localhost:8000/dashboard/")
    print("   Health: http://localhost:8000/health")
    print("\n🧪 Test the chat system:")
    print("   1. Open the dashboard in your browser")
    print("   2. Send a test message to the API")
    print("   3. Check if messages appear in the dashboard")
    
    print("\n⏹️ Press Ctrl+C to stop")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")

if __name__ == "__main__":
    main()