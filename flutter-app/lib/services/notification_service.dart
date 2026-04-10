import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Handling background message: ${message.messageId}');
}

class NotificationService {
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  
  static String? _fcmToken;
  static const String apiUrl = 'https://vshakago.in/api';

  static Future<void> initialize() async {
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ Notification permission granted');
    } else {
      print('❌ Notification permission denied');
      return;
    }

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    const androidChannel = AndroidNotificationChannel(
      'resort_bookings',
      'Resort Bookings',
      description: 'Notifications for resort bookings and updates',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    _fcmToken = await _firebaseMessaging.getToken();
    print('📱 FCM Token: $_fcmToken');

    if (_fcmToken != null) {
      await _saveTokenToBackend(_fcmToken!);
    }

    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      _fcmToken = newToken;
      _saveTokenToBackend(newToken);
    });

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    RemoteMessage? initialMessage = await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  static Future<void> _saveTokenToBackend(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final email = prefs.getString('user_email');
      final phone = prefs.getString('user_phone');

      final response = await http.post(
        Uri.parse('$apiUrl/device-tokens'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'token': token,
          'deviceId': await _getDeviceId(),
          'deviceType': 'android',
          'userEmail': email,
          'userPhone': phone,
        }),
      );

      if (response.statusCode == 200) {
        print('✅ Token saved to backend');
      } else {
        print('❌ Failed to save token: ${response.body}');
      }
    } catch (e) {
      print('❌ Error saving token: $e');
    }
  }

  static void _handleForegroundMessage(RemoteMessage message) {
    print('📬 Foreground message: ${message.notification?.title}');

    if (message.notification != null) {
      _showLocalNotification(message);
    }
  }

  static Future<void> _showLocalNotification(RemoteMessage message) async {
    const androidDetails = AndroidNotificationDetails(
      'resort_bookings',
      'Resort Bookings',
      channelDescription: 'Notifications for resort bookings and updates',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      details,
      payload: json.encode(message.data),
    );
  }

  static void _handleNotificationTap(RemoteMessage message) {
    print('🔔 Notification tapped: ${message.data}');
  }

  static void _onNotificationTap(NotificationResponse response) {
    if (response.payload != null) {
      final data = json.decode(response.payload!);
      print('🔔 Local notification tapped: $data');
    }
  }

  static Future<String> _getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');
    
    if (deviceId == null) {
      deviceId = DateTime.now().millisecondsSinceEpoch.toString();
      await prefs.setString('device_id', deviceId);
    }
    
    return deviceId;
  }

  static Future<void> deactivateToken() async {
    if (_fcmToken == null) return;

    try {
      await http.post(
        Uri.parse('$apiUrl/device-tokens/deactivate'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'token': _fcmToken}),
      );
      print('✅ Token deactivated');
    } catch (e) {
      print('❌ Error deactivating token: $e');
    }
  }

  static String? get fcmToken => _fcmToken;
}
