import uvicorn
import asyncio
from main_mcp import app

if __name__ == "__main__":
    # Run FastAPI with uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)