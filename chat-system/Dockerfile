FROM python:3.10-slim

WORKDIR /app

# 1️⃣ Install Python dependencies (includes mcp)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2️⃣ Copy project code
COPY . .

# 3️⃣ Install THIS project as editable package
# This registers `vizag-mcp-server` CLI entrypoint
RUN pip install -e .

EXPOSE 8000 8001

CMD ["python", "run.py"]
