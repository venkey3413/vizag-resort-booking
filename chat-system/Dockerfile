FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir fastapi uvicorn requests websockets pydantic
RUN pip install --no-cache-dir git+https://github.com/modelcontextprotocol/python-sdk.git

COPY requirements.txt .

COPY . .

EXPOSE 8000 8001

CMD ["python", "run.py"]