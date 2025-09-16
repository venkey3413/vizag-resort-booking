#!/bin/bash

# Update nginx configuration with webhook proxy
sudo tee /etc/nginx/sites-available/vizagresort << 'EOF'
server {
    listen 80;
    server_name vizagresortbooking.in www.vizagresortbooking.in;
    
    # Main site proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket webhook proxy
    location /webhook/ {
        proxy_pass http://localhost:3003/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Nginx configuration updated!"
echo "🧪 Testing webhook..."
curl https://vizagresortbooking.in/webhook/test