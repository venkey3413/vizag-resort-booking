@echo off
echo Starting Vizag Resort Booking with Integrated AI Chat...

echo.
echo Installing Python dependencies...
cd chat-app
pip install -r requirements.txt
cd ..

echo.
echo Starting integrated server with AI chat...
node server.js

pause