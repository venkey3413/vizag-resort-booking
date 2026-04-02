# Telegram Notifications Setup Guide

This guide will help you set up Telegram notifications for booking alerts.

## Prerequisites
- A Telegram account
- Access to your server's `.env` file

## Step-by-Step Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat with BotFather
3. Send the command: `/newbot`
4. Follow the prompts:
   - Choose a name for your bot (e.g., "Vizag Resort Notifications")
   - Choose a username for your bot (must end in 'bot', e.g., "vizag_resort_bot")
5. BotFather will give you a **Bot Token** that looks like:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
6. **Save this token** - you'll need it for the `.env` file

### 2. Get Your Chat ID

#### Option A: Using @userinfobot (Easiest)
1. Search for **@userinfobot** on Telegram
2. Start a chat with it
3. Send any message
4. The bot will reply with your user information including your **Chat ID**
5. Copy the Chat ID (it will be a number like `123456789`)

#### Option B: Using @RawDataBot
1. Search for **@RawDataBot** on Telegram
2. Start a chat with it
3. Send any message
4. Look for `"id":` in the response - that's your Chat ID

#### Option C: Manual Method
1. Start a chat with your bot (search for the username you created)
2. Send any message to your bot (e.g., "Hello")
3. Open this URL in your browser (replace `YOUR_BOT_TOKEN` with your actual token):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
4. Look for `"chat":{"id":` in the JSON response
5. Copy the ID number

### 3. Update .env File

1. Open your `.env` file in the project root
2. Update these two lines with your actual values:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID=123456789
   ```
3. Save the file

### 4. Restart Your Server

After updating the `.env` file, restart your Node.js server:

```bash
# If using PM2
pm2 restart all

# If running directly
# Stop the server (Ctrl+C) and start again
node server.js
```

### 5. Test the Notifications

1. Make a test booking on your website
2. Check your Telegram chat with the bot
3. You should receive a notification with booking details

## Troubleshooting

### Not Receiving Notifications?

1. **Check Bot Token**: Make sure the token is correct and has no extra spaces
2. **Check Chat ID**: Ensure the Chat ID is correct
3. **Start the Bot**: Make sure you've sent at least one message to your bot
4. **Check Logs**: Look at your server logs for error messages:
   ```bash
   pm2 logs
   ```
5. **Verify .env**: Make sure the `.env` file is in the project root directory
6. **Restart Server**: Always restart after changing `.env`

### Common Errors

**"Telegram credentials not configured"**
- Your `.env` file still has placeholder values
- Update with real Bot Token and Chat ID

**"Forbidden: bot was blocked by the user"**
- You blocked the bot on Telegram
- Unblock it and send a message to restart

**"Bad Request: chat not found"**
- Wrong Chat ID
- Get your Chat ID again using @userinfobot

## Notification Format

When a booking is placed, you'll receive:
```
🏨 NEW BOOKING RECEIVED!

📋 Booking ID: VE123456789
👤 Guest: John Doe
📧 Email: john@example.com
📱 Phone: +919876543210
🏖️ Resort: Beach Paradise Resort
📅 Check-in: 2024-01-15
📅 Check-out: 2024-01-17
👥 Guests: 4
💰 Total: ₹5,000
💳 Status: pending

⏰ Booked at: 15/1/2024, 10:30:45 am
```

## Security Notes

- **Never share your Bot Token** publicly
- Keep your `.env` file secure and never commit it to Git
- The `.env` file is already in `.gitignore` to prevent accidental commits
- If your token is compromised, revoke it via @BotFather and create a new bot

## Additional Features

### Multiple Recipients
To send notifications to multiple people:
1. Create a Telegram group
2. Add your bot to the group
3. Get the group's Chat ID (it will be negative, like `-123456789`)
4. Use the group Chat ID in your `.env` file

### Custom Notifications
You can customize notification messages in `telegram-service.js`

## Support

If you need help:
- Check server logs: `pm2 logs` or `tail -f logs/error.log`
- Verify Telegram API status: https://core.telegram.org/bots/api
- Contact support: vizagresortbooking@gmail.com
