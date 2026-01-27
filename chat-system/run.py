import uvicorn
from fastapi import FastAPI

# Import apps
from main import app as chat_app
from dashboard import dashboard_app

# ✅ CREATE ROOT APP
app = FastAPI(title="Vizag Resort Booking Chat System")

# ✅ MOUNT CHAT API
app.mount("/", chat_app)

# ✅ MOUNT HUMAN DASHBOARD
app.mount("/dashboard", dashboard_app)
app.mount("/agent", dashboard_app)  # alias

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False
    )