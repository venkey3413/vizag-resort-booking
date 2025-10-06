# Grafana + Prometheus Monitoring Setup

## Quick Start

1. **Upload files to your EC2 server:**
```bash
scp -r monitoring/ ubuntu@your-server-ip:~/vizag-resort-booking/
```

2. **SSH to your server and run:**
```bash
cd ~/vizag-resort-booking/monitoring
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
sudo systemctl start docker
sudo systemctl enable docker
```

3. **Logout and login again, then start monitoring:**
```bash
cd ~/vizag-resort-booking/monitoring
docker-compose up -d
```

## Access Dashboards

- **Grafana**: http://your-server-ip:3004
  - Username: `admin`
  - Password: `vizagresort123`

- **Prometheus**: http://your-server-ip:9090

## Grafana Setup Steps

1. Login to Grafana
2. Go to Configuration → Data Sources
3. Add Prometheus data source: `http://prometheus:9090`
4. Import dashboard ID: `1860` (Node Exporter Full)
5. Create custom dashboard for your booking system

## Commands

```bash
# Start monitoring
docker-compose up -d

# Stop monitoring
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```