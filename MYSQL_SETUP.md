# MySQL Database Setup

## 🗄️ Install MySQL on EC2

### 1. Install MySQL Server
```bash
sudo apt update
sudo apt install mysql-server -y
```

### 2. Secure MySQL Installation
```bash
sudo mysql_secure_installation
```
- Set root password: `password` (or your choice)
- Remove anonymous users: `Y`
- Disallow root login remotely: `Y`
- Remove test database: `Y`
- Reload privilege tables: `Y`

### 3. Configure MySQL User
```bash
sudo mysql -u root -p
```

In MySQL console:
```sql
CREATE DATABASE resort_booking;
CREATE USER 'resort_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON resort_booking.* TO 'resort_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Update Database Config
Edit `database.js`:
```javascript
const dbConfig = {
    host: 'localhost',
    user: 'resort_user',  // or 'root'
    password: 'password', // your password
    database: 'resort_booking'
};
```

### 5. Install Dependencies
```bash
npm install mysql2
```

### 6. Start Services
```bash
pm2 start ecosystem.config.js
```

## 🔧 Database Features

### ✅ **Persistent Storage**
- Resorts saved permanently
- Bookings stored in database
- Data survives server restarts

### ✅ **Auto-Created Tables**
- `resorts` - Resort information
- `bookings` - Booking history
- Foreign key relationships

### ✅ **Default Data**
- Sample resorts auto-inserted
- Ready to use immediately

## 🚀 Test Database
```bash
mysql -u resort_user -p resort_booking
```

```sql
SHOW TABLES;
SELECT * FROM resorts;
SELECT * FROM bookings;
```

## 🔒 Security Notes
- Change default passwords
- Use environment variables for production
- Enable SSL for remote connections