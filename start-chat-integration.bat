@echo off
echo Starting Vizag Resort Booking with Chat Integration...

echo.
echo Starting main server on port 3000...
start "Main Server" cmd /k "cd /d %~dp0 && node server.js"

echo.
echo Waiting 5 seconds for main server to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting chat app on port 8000...
start "Chat App" cmd /k "cd /d %~dp0\chat-app && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo Both servers are starting...
echo Main server: http://localhost:3000
echo Chat API: http://localhost:8000
echo Chat widget: http://localhost:8000/static/chat-widget.html
echo.
echo Available API endpoints:
echo - Main server database APIs: http://localhost:3000/api/chat/*
echo - Chat app APIs: http://localhost:8000/api/data/*
echo - Chat interface: http://localhost:8000/api/chat
echo.
pause