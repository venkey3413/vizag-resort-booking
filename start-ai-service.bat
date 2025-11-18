@echo off
echo Starting AI Chat Service...
cd chat-app
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload