import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/resort.dart';
import '../models/booking.dart';

class ApiService {
  static const String baseUrl = 'https://vizagresortbooking.in';
  
  // Get all resorts
  static Future<List<Resort>> getResorts() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/resorts'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Resort.fromJson(json)).toList();
      }
      throw Exception('Failed to load resorts');
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Create booking
  static Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/bookings'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(bookingData),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body);
      }
      throw Exception('Failed to create booking');
    } catch (e) {
      throw Exception('Booking error: $e');
    }
  }

  // Get booking by reference
  static Future<Booking> getBooking(String reference) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/bookings/$reference'));
      if (response.statusCode == 200) {
        return Booking.fromJson(json.decode(response.body));
      }
      throw Exception('Booking not found');
    } catch (e) {
      throw Exception('Error fetching booking: $e');
    }
  }

  // Submit payment proof
  static Future<bool> submitPaymentProof(String bookingId, String utrId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/payment-proof'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'booking_id': bookingId,
          'transaction_id': utrId,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}