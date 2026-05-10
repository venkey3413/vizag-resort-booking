# Interior Service Deployment Guide for EC2 with Nginx

## Prerequisites
- EC2 instance with Nginx installed
- Domain: vshakago.in with SSL certificates
- Docker and Docker Compose installed

## Deployment Steps

### 1. SSH into EC2
```bash
ssh -i your-key.pem ubuntu@35.154.92.5
```

### 2. Navigate to project directory
```bash
cd vizag-resort-booking
git pull origin main
```

### 3. Build and run the interior service Docker container
```bash
docker-compose -f docker-compose.interior.yml up -d --build
```

### 4. Verify container is running
```bash
docker ps | grep interior
docker logs vizag-resort-booking-interior-service-1
```

### 5. Update Nginx configuration

#### Option A: Add to existing vshakago.in configuration
Edit your existing Nginx config file:
```bash
sudo nano /etc/nginx/sites-available/vshakago.in
```

Add this location block inside the existing `server` block (port 443):
```nginx
    # Interior service
    location /interiors {
        rewrite ^/interiors(/.*)$ $1 break;
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
```

Also add HTTP to HTTPS redirect in the port 80 server block:
```nginx
    location /interiors {
        return 301 https://$server_name$request_uri;
    }
```

#### Option B: Use the provided configuration file
```bash
# Copy the nginx-interior.conf as reference
# Merge the location blocks into your existing configuration
```

### 6. Test Nginx configuration
```bash
sudo nginx -t
```

### 7. Reload Nginx
```bash
sudo systemctl reload nginx
```

### 8. Update Vite base path (if needed for production build)
If you want to build for production, update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/interiors/',
  // ... rest of config
});
```

Then rebuild:
```bash
docker-compose -f docker-compose.interior.yml down
docker-compose -f docker-compose.interior.yml up -d --build
```

### 9. Verify deployment
```bash
# Check local access
curl http://localhost:3006

# Check via domain
curl https://vshakago.in/interiors
```

### 10. Access the service
Open browser: https://vshakago.in/interiors

## Troubleshooting

### Check Docker logs
```bash
docker logs -f vizag-resort-booking-interior-service-1
```

### Check Nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart services
```bash
# Restart Docker container
docker-compose -f docker-compose.interior.yml restart

# Restart Nginx
sudo systemctl restart nginx
```

### Check port 3006 is listening
```bash
sudo netstat -tulpn | grep 3006
```

## Security Group Configuration
Ensure EC2 security group allows:
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3006 is NOT needed to be open (Nginx proxies internally)

## SSL Certificate Renewal
Your existing Let's Encrypt certificates will automatically cover the /interiors path since it's on the same domain.

## Notes
- The service runs in development mode with hot reload
- For production, consider building static files and serving with Nginx directly
- The rewrite rule removes `/interiors` prefix before passing to the Vite dev server
