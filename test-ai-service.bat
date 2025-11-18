@echo off
echo Testing AI Chat Service connection...
curl -X POST http://127.0.0.1:8001/api/chat -H "Content-Type: application/json" -d "{\"session_id\":\"test\",\"message\":\"hello\"}"
echo.
echo If you see an error above, the AI service is not running.
echo To start it, run: start-ai-service-manual.bat
pause