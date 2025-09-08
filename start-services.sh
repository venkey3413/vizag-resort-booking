#!/bin/bash

echo "🔄 Stopping existing services..."
pkill -f node

echo "🚀 Starting all services..."

# Start main server
nohup node server.js > logs/server.log 2>&1 &
echo "✅ Main server started (PID: $!)"

# Start admin server  
nohup node admin-server.js > logs/admin.log 2>&1 &
echo "✅ Admin server started (PID: $!)"

# Start booking server
nohup node booking-server.js > logs/booking.log 2>&1 &
echo "✅ Booking server started (PID: $!)"

# Start API gateway
nohup node api-gateway.js > logs/gateway.log 2>&1 &
echo "✅ API Gateway started (PID: $!)"

echo ""
echo "🎯 All services started successfully!"
echo "📊 Main Website: http://localhost:3000"
echo "🔧 Admin Panel: http://localhost:3001" 
echo "📋 Booking History: http://localhost:3002"
echo "🌐 API Gateway: http://localhost:4000"
echo ""
echo "📝 Check logs: tail -f logs/*.log"
echo "🔍 Check processes: ps aux | grep node"