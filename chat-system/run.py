import uvicorn
from fastapi import FastAPI

# Import chatbot API
from main import app as chat_app

# Import human dashboard
from dashboard import dashboard_app

# 🔥 Root app
app = FastAPI(title="Vizag Resort Booking Chat System")

# 🔥 Mount chatbot API
app.mount("/api", chat_app)

# 🔥 Mount human agent dashboard
app.mount("/dashboard", dashboard_app)

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Vizag Resort Booking Chat System running",
        "endpoints": {
            "chat": "/api/chat",
            "dashboard": "/dashboard"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)