@echo off
echo Installing Python dependencies for AI Chat Service...
cd chat-app
pip install fastapi uvicorn langchain langchain-community langgraph chromadb sqlalchemy sentence-transformers openai
echo.
echo Starting AI Chat Service on port 8001...
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause