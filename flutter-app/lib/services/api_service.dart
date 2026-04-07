import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/resort.dart';
import '../models/event.dart';

class ApiService {
  static const String baseUrl = "https://vshakago.in";
  static const String apiKey = "vshakago-mobile-2026-secure-key";

  // Common headers with API key
  static Map<String, String> get headers => {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  static Future<List<Resort>> getResorts() async {
    final response = await http.get(
      Uri.parse("$baseUrl/api/resorts"),
      headers: headers,
    );

    if (response.statusCode == 200) {
      List data = jsonDecode(response.body);
      return data.map((e) => Resort.fromJson(e)).toList();
    } else {
      throw Exception("Failed to load resorts");
    }
  }

  static Future<List<Event>> getEvents() async {
    final response = await http.get(
      Uri.parse("$baseUrl/api/events"),
      headers: headers,
    );

    if (response.statusCode == 200) {
      List data = jsonDecode(response.body);
      return data.map((e) => Event.fromJson(e)).toList();
    } else {
      throw Exception("Failed to load events");
    }
  }

  static Future<Map<String, dynamic>> bookEvent(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse("$baseUrl/api/event-bookings"),
      headers: headers,
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to create event booking");
    }
  }

  static Future<Map<String, dynamic>> bookResort(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse("$baseUrl/api/bookings"),
      headers: headers,
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to create booking");
    }
  }

  static Future<Map<String, dynamic>> checkAvailability(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse("$baseUrl/api/check-availability"),
      headers: headers,
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? "Availability check failed");
    }
  }

  // Get Razorpay Key
  static Future<String> getRazorpayKey() async {
    final response = await http.get(
      Uri.parse("$baseUrl/api/razorpay-key"),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['key'] ?? '';
    } else {
      throw Exception("Failed to get Razorpay key");
    }
  }

  // Get Coupons
  static Future<List<dynamic>> getCoupons({int? resortId}) async {
    String url = "$baseUrl/api/coupons";
    if (resortId != null) {
      url += "?resortId=$resortId";
    }
    
    final response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to get coupons");
    }
  }

  // Owner Login
  static Future<Map<String, dynamic>> ownerLogin(String email, String password) async {
    final response = await http.post(
      Uri.parse("$baseUrl/api/owner-login"),
      headers: headers,
      body: jsonEncode({
        "email": email,
        "password": password,
      }),
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
    final response = await http.post(
      Uri.parse("$baseUrl/api/verify-payment"),
      headers: headers,
      body: jsonEncode({
        "paymentId": paymentId,
        "orderId": orderId,
        "signature": signature,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Payment verification failed");
    }
  }
}
