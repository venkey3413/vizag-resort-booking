@echo off
echo Starting Vizag Resort Chat App locally with Docker...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    copy .env.example .env
    echo Created .env file. Please edit it with your OpenAI API key.
    pause
)

REM Setup database
python setup_database.py

REM Build and start containers
docker-compose up --build

pause