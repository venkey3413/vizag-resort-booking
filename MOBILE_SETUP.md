# 📱 Mobile App Setup Guide

## Prerequisites
- Node.js installed
- Android Studio (for Android)
- Xcode (for iOS - Mac only)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
npm run cap:install
```

### 2. Initialize Capacitor
```bash
npx cap init "Vizag Resorts" "com.vizagresorts.app"
```

### 3. Add Platforms
```bash
npm run cap:add
```

### 4. Build and Sync
```bash
npm run build:mobile
```

### 5. Open in Native IDEs
```bash
# For Android
npm run cap:open:android

# For iOS (Mac only)
npm run cap:open:ios
```

## Development Workflow

### After Code Changes
```bash
npm run build:mobile
```

### Update Native Projects
```bash
npx cap sync
```

## Build for Production

### Android APK
1. Open Android Studio
2. Build → Generate Signed Bundle/APK
3. Choose APK
4. Create/use keystore
5. Build release APK

### iOS App Store
1. Open Xcode
2. Product → Archive
3. Upload to App Store Connect

## App Features
- ✅ Native performance
- ✅ Offline capability
- ✅ Push notifications (can be added)
- ✅ Camera access for payment screenshots
- ✅ Native file system
- ✅ App store distribution

## Configuration
- App ID: com.vizagresorts.app
- App Name: Vizag Resorts
- Server URL: https://vizagresortbooking.in
- All existing features work identically