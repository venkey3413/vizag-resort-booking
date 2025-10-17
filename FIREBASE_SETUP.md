# Firebase Phone Authentication Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `vizag-resort-booking`
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Phone Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Phone** provider
3. Click **Enable** toggle
4. Click **Save**

## Step 3: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click **Web app** icon (`</>`)
4. Register app with name: `Vizag Resort Booking`
5. Copy the `firebaseConfig` object

## Step 4: Update Configuration

Replace the placeholder values in `public/index.html`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com", 
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};
```

## Step 5: Configure Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domain: `vizagresortbooking.in`
3. For testing, `localhost` should already be included

## Step 6: Test the Implementation

1. Open your website
2. Try to book a resort
3. Enter a valid phone number
4. Click "Send OTP"
5. Enter the received OTP
6. Verify the phone number is verified before booking

## Features Implemented

✅ **Phone OTP Verification**: Users must verify phone number before booking
✅ **Firebase Integration**: Uses Firebase Phone Authentication
✅ **10,000 Free Verifications/month**: Firebase free tier
✅ **Spam Protection**: Built-in reCAPTCHA verification
✅ **Real Phone Validation**: Ensures genuine phone numbers
✅ **Booking Security**: Prevents fake bookings

## Benefits

- **Reduces Fake Bookings**: Only verified phone numbers can book
- **Improves Contact Quality**: Ensures customers can be reached
- **Free Service**: 10,000 verifications per month at no cost
- **Reliable**: Google's Firebase infrastructure
- **Global Support**: Works with international phone numbers

## Troubleshooting

**OTP not received?**
- Check phone number format (+91xxxxxxxxxx)
- Verify Firebase project is active
- Check authorized domains configuration

**reCAPTCHA issues?**
- Ensure domain is authorized in Firebase
- Check browser console for errors
- Try in incognito mode

**Verification fails?**
- Check Firebase quota limits
- Verify API key is correct
- Check network connectivity

## Cost Information

- **Free Tier**: 10,000 phone verifications per month
- **Paid Tier**: $0.01 per verification after free limit
- **Very cost-effective** for most booking websites

## Security Notes

- Phone numbers are verified through Firebase
- OTP codes expire automatically
- Built-in spam protection via reCAPTCHA
- No phone numbers stored in plain text
- Verification status tracked in database