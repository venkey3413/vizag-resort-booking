import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'https://vizagresortbooking.in';
  
  static Future<List<dynamic>> getResorts() async {
    final response = await http.get(Uri.parse('$baseUrl/api/resorts'));
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load resorts');
  }

  static Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/bookings'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(bookingData),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(response.body);
    }
    throw Exception('Failed to create booking');
  }

  static Future<List<dynamic>> getFoodItems() async {
    final response = await http.get(Uri.parse('$baseUrl/api/food-items'));
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load food items');
  }

  static Future<Map<String, dynamic>> createFoodOrder(Map<String, dynamic> orderData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/food-orders'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(orderData),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(response.body);
    }
    throw Exception('Failed to create food order');
  }
}