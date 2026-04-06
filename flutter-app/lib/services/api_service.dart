import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/resort.dart';
import '../models/event.dart';

class ApiService {
  static const String baseUrl = "https://vshakago.in";

  static Future<List<Resort>> getResorts() async {
    final response = await http.get(Uri.parse("$baseUrl/api/resorts"));

    if (response.statusCode == 200) {
      List data = jsonDecode(response.body);
      return data.map((e) => Resort.fromJson(e)).toList();
    } else {
      throw Exception("Failed to load resorts");
    }
  }

  static Future<List<Event>> getEvents() async {
    final response = await http.get(Uri.parse("$baseUrl/api/events"));

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
      headers: {"Content-Type": "application/json"},
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
      headers: {"Content-Type": "application/json"},
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
      headers: {"Content-Type": "application/json"},
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
    final response = await http.get(Uri.parse("$baseUrl/api/razorpay-key"));

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
    
    final response = await http.get(Uri.parse(url));

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
      headers: {"Content-Type": "application/json"},
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
}
