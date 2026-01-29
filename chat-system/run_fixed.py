import uvicorn
from main import app
from dashboard_redis import dashboard_app

# Mount dashboard
app.mount("/dashboard", dashboard_app)

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False
    )