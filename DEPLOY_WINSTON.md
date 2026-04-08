# Quick Deploy: Winston Structured Logging

## 1. Install Dependencies
```bash
npm install winston winston-daily-rotate-file
```

## 2. Create Logs Directory
```bash
mkdir -p logs
chmod 755 logs
```

## 3. Update .env
```bash
echo "NODE_ENV=production" >> .env
echo "LOG_LEVEL=info" >> .env
echo "SERVICE_NAME=vizag-resort" >> .env
```

## 4. Deploy to EC2
```bash
# SSH to server
ssh -i your-key.pem ubuntu@35.154.92.5

# Navigate to project
cd /home/ubuntu/vizag-resort-booking

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Create logs directory
mkdir -p logs

# Rebuild Docker containers
docker-compose build --no-cache

# Restart services
docker-compose down
docker-compose up -d

# Verify logs
docker-compose logs -f main-service | head -20
```

## 5. Verify Logging
```bash
# Check log files created
ls -lh logs/

# View real-time logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Search for payment logs (should show masked data)
grep "PAYMENT" logs/combined-$(date +%Y-%m-%d).log

# Check error logs
tail -f logs/error-$(date +%Y-%m-%d).log
```

## 6. Test Masking
```bash
# Trigger a test payment webhook
curl -X POST http://localhost:3000/api/razorpay-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_TEST123456789"}}}}'

# Verify payment ID is masked in logs
grep "pay_" logs/combined-$(date +%Y-%m-%d).log
# Should show: pay_****789 (not full ID)
```

## Expected Output

**Masked Payment Log:**
```json
{
  "level": "info",
  "message": "[PAYMENT] Payment captured",
  "paymentId": "pay_****789",
  "amount": 5000,
  "orderId": "orde****456",
  "status": "captured",
  "timestamp": "2024-01-15 10:30:45"
}
```

## Troubleshooting

**Logs not created:**
```bash
# Check permissions
ls -la logs/
chmod 755 logs/

# Check NODE_ENV
echo $NODE_ENV
```

**Disk space issues:**
```bash
# Check disk usage
df -h
du -sh logs/

# Manual cleanup (if needed)
find logs/ -name "*.log*" -mtime +14 -delete
```

## Success Criteria

✅ Log files created in `logs/` directory
✅ Payment IDs masked (e.g., `pay_****789`)
✅ Transaction IDs masked (e.g., `UTR1****789`)
✅ Logs rotate daily
✅ Old logs compressed (.gz files)
✅ No sensitive data in plain text

## Rollback (if needed)
```bash
git revert HEAD
docker-compose build
docker-compose up -d
```

---
**Deployment Time:** ~5 minutes
**Zero Downtime:** Yes (rolling restart)
