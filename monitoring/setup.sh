#!/bin/bash

echo "Setting up Grafana + Prometheus monitoring for Vizag Resort Booking System"
echo "=================================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo usermod -aG docker $USER
    sudo systemctl start docker
    sudo systemctl enable docker
    echo "Docker installed successfully!"
    echo "Please logout and login again, then run this script again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo apt install -y docker-compose
fi

echo "Starting monitoring stack..."
docker-compose up -d

echo ""
echo "Monitoring stack started successfully!"
echo "=================================================================="
echo "Access your dashboards:"
echo "- Grafana: http://your-server-ip:3004 (admin/vizagresort123)"
echo "- Prometheus: http://your-server-ip:9090"
echo "=================================================================="
echo ""
echo "Next steps:"
echo "1. Open Grafana at http://your-server-ip:3004"
echo "2. Login with admin/vizagresort123"
echo "3. Add Prometheus data source: http://prometheus:9090"
echo "4. Import dashboard templates"
echo ""
echo "To stop monitoring: docker-compose down"
echo "To view logs: docker-compose logs -f"