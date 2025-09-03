# SSH Connection Troubleshooting

## 🔧 Quick Fixes

### 1. Check Security Group
- Go to EC2 → Security Groups
- Edit inbound rules:
  - **SSH (22)**: Source = My IP (not 0.0.0.0/0)
  - Click "Save rules"

### 2. Fix Key Permissions (Windows)
```bash
# In Git Bash or WSL
chmod 400 your-key.pem
```

### 3. Correct SSH Command
```bash
# Replace with your actual values
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Example:
ssh -i "resort-key.pem" ubuntu@3.15.123.45
```

### 4. Get Correct Public IP
- EC2 Console → Instances
- Select your instance
- Copy **Public IPv4 address**

### 5. Instance State Check
- Instance must be **Running**
- Status checks: **2/2 passed**

### 6. Alternative Connection Methods

**Using EC2 Instance Connect:**
- EC2 Console → Select instance
- Click "Connect" → "EC2 Instance Connect"
- Click "Connect"

**Using Session Manager:**
- Install AWS CLI
- Configure: `aws configure`
- Connect: `aws ssm start-session --target i-1234567890abcdef0`

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied | `chmod 400 key.pem` |
| Connection timeout | Check Security Group port 22 |
| Host key verification failed | `ssh-keygen -R your-ec2-ip` |
| Wrong username | Use `ubuntu` for Ubuntu AMI |

## ✅ Test Connection
```bash
# Test if port 22 is open
telnet your-ec2-ip 22

# Verbose SSH for debugging
ssh -v -i "your-key.pem" ubuntu@your-ec2-ip
```