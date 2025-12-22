import uvicorn
import asyncio
from main import app
from dashboard import dashboard_app

async def run_servers():
    chat_config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False
    )
    chat_server = uvicorn.Server(chat_config)

    dashboard_config = uvicorn.Config(
        dashboard_app,
        host="0.0.0.0",
        port=8001,
        reload=False
    )
    dashboard_server = uvicorn.Server(dashboard_config)

    await asyncio.gather(
        chat_server.serve(),
        dashboard_server.serve()
    )

if __name__ == "__main__":
    asyncio.run(run_servers())
