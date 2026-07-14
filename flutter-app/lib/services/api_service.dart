import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/resort.dart';
import '../models/event.dart';
import 'dart:io';

class ApiService {
  static const String baseUrl = "https://vshakago.in";
  static const String apiKey = "vshakago-mobile-2026-secure-key";
  
  // Timeout duration for API calls
  static const Duration timeout = Duration(seconds: 30);

  // Common headers with API key and security headers
  static Map<String, String> get headers => {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "Accept": "application/json",
    "User-Agent": "VshakaGo-Mobile/1.0.0",
  };

  // Input validation helper
  static String sanitizeInput(String input) {
    return input.trim().replaceAll(RegExp(r'[<>"]'), '');
  }

  // Email validation
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  // Phone validation (Indian format)
  static bool isValidPhone(String phone) {
    return RegExp(r'^[6-9]\d{9}$').hasMatch(phone);
  }

  // Generic API call with error handling and timeout
  static Future<http.Response> _makeRequest(
    String method,
    String endpoint,
    {Map<String, dynamic>? body}
  ) async {
    try {
      final uri = Uri.parse("$baseUrl$endpoint");
      http.Response response;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await http.get(uri, headers: headers).timeout(timeout);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          ).timeout(timeout);
          break;
        default:
          throw Exception('Unsupported HTTP method: $method');
      }

      // Check for rate limiting
      if (response.statusCode == 429) {
        throw Exception('Too many requests. Please try again later.');
      }

      // Check for authentication errors
      if (response.statusCode == 401) {
        throw Exception('Authentication failed. Please update the app.');
      }

      return response;
    } on SocketException {
      throw Exception('No internet connection. Please check your network.');
    } on http.ClientException {
      throw Exception('Network error. Please try again.');
    } on Exception catch (e) {
      if (e.toString().contains('TimeoutException')) {
        throw Exception('Request timeout. Please try again.');
      }
      rethrow;
    }
  }

  static Future<List<Resort>> getResorts() async {
    final response = await _makeRequest('GET', '/api/resorts');

    if (response.statusCode == 200) {
      List data = jsonDecode(response.body);
      return data.map((e) => Resort.fromJson(e)).toList();
    } else {
      throw Exception("Failed to load resorts");
    }
  }

  static Future<List<Event>> getEvents({String? type}) async {
    final endpoint = type != null
        ? '/api/events?type=${Uri.encodeComponent(type)}'
        : '/api/events';
    final response = await _makeRequest('GET', endpoint);

    if (response.statusCode == 200) {
      List data = jsonDecode(response.body);
      return data.map((e) => Event.fromJson(e)).toList();
    } else {
      throw Exception("Failed to load events");
    }
  }

  static Future<Map<String, dynamic>> bookEvent(Map<String, dynamic> data) async {
    // Validate required fields
    if (data['guestName'] == null || data['email'] == null || data['phone'] == null) {
      throw Exception('Missing required fields');
    }

    // Sanitize inputs
    data['guestName'] = sanitizeInput(data['guestName']);
    data['email'] = sanitizeInput(data['email']);
    data['phone'] = sanitizeInput(data['phone']);

    // Validate email
    if (!isValidEmail(data['email'])) {
      throw Exception('Invalid email format');
    }

    // Validate phone (remove +91 prefix if present)
    String phone = data['phone'].replaceAll('+91', '').replaceAll(' ', '');
    if (!isValidPhone(phone)) {
      throw Exception('Invalid phone number. Must be 10 digits starting with 6-9');
    }
    data['phone'] = '+91$phone';

    final response = await _makeRequest('POST', '/api/event-bookings', body: data);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? "Failed to create event booking");
    }
  }

  // Uploads a payment screenshot (UTR proof) to Cloudinary via the backend
  // and returns the hosted URL to attach to the booking.
  static Future<String> uploadPaymentScreenshot(File imageFile, {String? bookingReference, String? phone}) async {
    final uri = Uri.parse('$baseUrl/api/upload-payment-screenshot');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(headers);
    if (bookingReference != null) request.fields['bookingReference'] = bookingReference;
    if (phone != null) request.fields['phone'] = phone;
    request.files.add(await http.MultipartFile.fromPath('screenshot', imageFile.path));

    final streamedResponse = await request.send().timeout(timeout);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true && data['url'] != null) {
        return data['url'];
      }
      throw Exception(data['error'] ?? 'Screenshot upload failed');
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Screenshot upload failed');
    }
  }

  static Future<Map<String, dynamic>> bookResort(Map<String, dynamic> data) async {
    // Validate required fields
    if (data['guestName'] == null || data['email'] == null || data['phone'] == null) {
      throw Exception('Missing required fields');
    }

    // Sanitize inputs
    data['guestName'] = sanitizeInput(data['guestName']);
    data['email'] = sanitizeInput(data['email']);
    data['phone'] = sanitizeInput(data['phone']);

    // Validate email
    if (!isValidEmail(data['email'])) {
      throw Exception('Invalid email format');
    }

    // Validate phone
    String phone = data['phone'].replaceAll('+91', '').replaceAll(' ', '');
    if (!isValidPhone(phone)) {
      throw Exception('Invalid phone number. Must be 10 digits starting with 6-9');
    }
    data['phone'] = '+91$phone';

    // Validate dates
    if (data['checkIn'] != null && data['checkOut'] != null) {
      DateTime checkIn = DateTime.parse(data['checkIn']);
      DateTime checkOut = DateTime.parse(data['checkOut']);
      DateTime now = DateTime.now();
      // Compare dates only (strip time-of-day) — otherwise a same-day
      // check-in (parsed as midnight) is always "before" the current
      // time of day, incorrectly rejecting valid same-day bookings.
      DateTime today = DateTime(now.year, now.month, now.day);

      if (checkIn.isBefore(today)) {
        throw Exception('Check-in date cannot be in the past');
      }

      if (checkOut.isBefore(checkIn) || checkOut.isAtSameMomentAs(checkIn)) {
        throw Exception('Check-out must be after check-in date');
      }
    }

    // Validate guests
    if (data['guests'] != null) {
      int guests = data['guests'] is int ? data['guests'] : int.parse(data['guests'].toString());
      if (guests < 1 || guests > 20) {
        throw Exception('Number of guests must be between 1 and 20');
      }
    }

    final response = await _makeRequest('POST', '/api/bookings', body: data);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? "Failed to create booking");
    }
  }

  // Uploads a payment screenshot to Cloudinary via the existing
  // /api/upload-payment-screenshot endpoint and returns the hosted URL.
  static Future<String> uploadPaymentScreenshot(File imageFile, String bookingReference) async {
    final uri = Uri.parse("$baseUrl/api/upload-payment-screenshot");
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll({
      "X-API-Key": apiKey,
      "Accept": "application/json",
    });
    request.fields['bookingReference'] = bookingReference;
    request.files.add(await http.MultipartFile.fromPath('screenshot', imageFile.path));

    final streamedResponse = await request.send().timeout(timeout);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true && data['url'] != null) {
        return data['url'];
      }
      throw Exception(data['error'] ?? 'Screenshot upload failed');
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Screenshot upload failed');
    }
  }

  static Future<Map<String, dynamic>> checkAvailability(Map<String, dynamic> data) async {
    final response = await _makeRequest('POST', '/api/check-availability', body: data);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? "Availability check failed");
    }
  }

  // Get Razorpay Key
  static Future<String> getRazorpayKey() async {
    final response = await _makeRequest('GET', '/api/razorpay-key');

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['key'] ?? '';
    } else {
      throw Exception("Failed to get Razorpay key");
    }
  }

  // Get Coupons
  static Future<List<dynamic>> getCoupons({int? resortId}) async {
    String endpoint = "/api/coupons";
    if (resortId != null) {
      endpoint += "?resortId=$resortId";
    }
    
    final response = await _makeRequest('GET', endpoint);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to get coupons");
    }
  }

  // Owner Login with validation
  static Future<Map<String, dynamic>> ownerLogin(String email, String password) async {
    // Sanitize inputs
    email = sanitizeInput(email);
    
    // Validate email
    if (!isValidEmail(email) && !isValidPhone(email.replaceAll('+91', ''))) {
      throw Exception('Invalid email or phone format');
    }

    // Validate password
    if (password.isEmpty || password.length < 8) {
      throw Exception('Password must be at least 8 characters');
    }

    final response = await _makeRequest(
      'POST',
      '/api/owner-login',
      body: {
        "email": email,
        "password": password,
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? "Login failed");
    }
  }

  // Verify Razorpay Payment
  static Future<Map<String, dynamic>> verifyPayment(
    String paymentId,
    String? orderId,
    String signature,
  ) async {
    final response = await _makeRequest(
      'POST',
      '/api/verify-payment',
      body: {
        "paymentId": paymentId,
        "orderId": orderId,
        "signature": signature,
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Payment verification failed");
    }
  }
}
