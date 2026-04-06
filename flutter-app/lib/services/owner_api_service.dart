import 'dart:convert';
import 'package:http/http.dart' as http;

class OwnerApiService {
  static const String baseUrl = 'https://vshakago.in';
  
  // Login
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/owner-login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email, 'password': password}),
    ).timeout(const Duration(seconds: 10));
    
    return json.decode(response.body);
  }
  
  // Verify QR Ticket
  static Future<Map<String, dynamic>> verifyTicket(String bookingRef, int ownerId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/verify-ticket'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'bookingReference': bookingRef, 'ownerId': ownerId}),
    ).timeout(const Duration(seconds: 10));
    
    return json.decode(response.body);
  }
  
  // Get all bookings
  static Future<List<dynamic>> getBookings() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/bookings'),
    ).timeout(const Duration(seconds: 10));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load bookings');
  }
  
  // Get all resorts
  static Future<List<dynamic>> getResorts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/resorts'),
    ).timeout(const Duration(seconds: 10));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load resorts');
  }
  
  // Get single resort
  static Future<Map<String, dynamic>> getResort(int resortId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/resorts/$resortId'),
    ).timeout(const Duration(seconds: 10));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load resort');
  }
  
  // Update resort
  static Future<bool> updateResort(int resortId, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/resorts/$resortId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    ).timeout(const Duration(seconds: 10));
    
    return response.statusCode == 200;
  }
  
  // Get blocked dates
  static Future<List<String>> getBlockedDates(int resortId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/blocked-dates/$resortId'),
    ).timeout(const Duration(seconds: 10));
    
    if (response.statusCode == 200) {
      final List<dynamic> dates = json.decode(response.body);
      return dates.map((d) => d.toString()).toList();
    }
    return [];
  }
  
  // Block a date
  static Future<bool> blockDate(int resortId, String date, String reason) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/blocked-dates'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'resortId': resortId,
        'blockDate': date,
        'reason': reason,
      }),
    ).timeout(const Duration(seconds: 10));
    
    return response.statusCode == 200;
  }
  
  // Unblock a date
  static Future<bool> unblockDate(int resortId, String date) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/blocked-dates/$resortId/$date'),
    ).timeout(const Duration(seconds: 10));
    
    return response.statusCode == 200;
  }
  
  // Get dynamic pricing
  static Future<List<dynamic>> getDynamicPricing(int resortId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/dynamic-pricing/$resortId'),
    ).timeout(const Duration(seconds: 10));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    return [];
  }
  
  // Update dynamic pricing
  static Future<bool> updateDynamicPricing(
    int resortId,
    String? weekdayPrice,
    String? fridayPrice,
    String? weekendPrice,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/dynamic-pricing'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'resortId': resortId,
        'weekdayPrice': weekdayPrice,
        'fridayPrice': fridayPrice,
        'weekendPrice': weekendPrice,
      }),
    ).timeout(const Duration(seconds: 10));
    
    return response.statusCode == 200;
  }
}
