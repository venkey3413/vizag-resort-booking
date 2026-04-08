#!/bin/bash
# Fix docker-compose environment variable warning

echo "Searching for problematic variable reference..."
grep -r "yk3CSGILVFJbwKiescgBn" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null

echo ""
echo "Adding missing environment variables to .env..."

# Add NODE_ENV if missing
if ! grep -q "NODE_ENV=" .env; then
    echo "NODE_ENV=production" >> .env
    echo "✅ Added NODE_ENV=production"
fi

# Add LOG_LEVEL if missing
if ! grep -q "LOG_LEVEL=" .env; then
    echo "LOG_LEVEL=info" >> .env
    echo "✅ Added LOG_LEVEL=info"
fi

# Add SERVICE_NAME if missing
if ! grep -q "SERVICE_NAME=" .env; then
    echo "SERVICE_NAME=vizag-resort" >> .env
    echo "✅ Added SERVICE_NAME=vizag-resort"
fi

echo ""
echo "Creating logs directory..."
mkdir -p logs
chmod 755 logs
echo "✅ Logs directory created"

echo ""
echo "Rebuilding services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "✅ Services restarted. Checking logs..."
sleep 5
docker-compose ps
