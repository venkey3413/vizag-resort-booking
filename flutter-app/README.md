# Vizag Resort Booking - Flutter Mobile App

A Flutter mobile application for booking resorts in Vizag, connected to the backend API.

## 📱 Features

- Browse available resorts
- View resort details with images and amenities
- Book resorts with date selection
- Form validation and error handling
- Real-time API integration

## 🚀 Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK
- Android Studio / VS Code with Flutter extensions
- Android Emulator or iOS Simulator

### Installation

1. **Navigate to the Flutter app directory:**
   ```bash
   cd flutter-app
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run the app:**
   ```bash
   flutter run
   ```

## 📁 Project Structure

```
flutter-app/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── models/
│   │   └── resort.dart              # Resort data model
│   ├── services/
│   │   └── api_service.dart         # API communication
│   ├── screens/
│   │   ├── home_screen.dart         # Resort listing
│   │   ├── details_screen.dart      # Resort details
│   │   └── booking_screen.dart      # Booking form
│   └── widgets/
│       └── resort_card.dart         # Reusable resort card
└── pubspec.yaml                     # Dependencies
```

## 🔌 API Integration

The app connects to the backend API at `https://vshakago.in`

### Endpoints Used:
- `GET /api/resorts` - Fetch all resorts
- `POST /api/bookings` - Create new booking
- `POST /api/check-availability` - Check resort availability

## 📝 Usage

1. **Home Screen**: Browse all available resorts
2. **Details Screen**: View resort information, amenities, and pricing
3. **Booking Screen**: Fill in guest details and select dates
4. **Confirmation**: Receive booking reference after successful submission

## 🎨 Customization

### Change API Base URL

Edit `lib/services/api_service.dart`:
```dart
static const String baseUrl = "https://your-domain.com";
```

### Modify Theme

Edit `lib/main.dart`:
```dart
theme: ThemeData(
  primarySwatch: Colors.blue,
  useMaterial3: true,
),
```

## 📦 Dependencies

- **http**: ^1.1.0 - HTTP requests
- **cupertino_icons**: ^1.0.2 - iOS-style icons

## 🔧 Build for Production

### Android APK
```bash
flutter build apk --release
```

### iOS IPA
```bash
flutter build ios --release
```

## 🐛 Troubleshooting

### Common Issues:

1. **Network Error**: Ensure backend API is running and accessible
2. **Image Loading**: Check image URLs and network permissions
3. **Date Picker**: Verify date format matches API requirements (YYYY-MM-DD)

### Enable Internet Permission (Android)

Already configured in `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

## 📱 Screenshots

- Home screen with resort listings
- Resort details with amenities
- Booking form with date pickers
- Success confirmation dialog

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is part of the Vizag Resort Booking System.

## 📞 Support

For issues or questions, contact: vizagresortbooking@gmail.com
