import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'booking_form_screen.dart';

class ResortListScreen extends StatefulWidget {
  const ResortListScreen({super.key});

  @override
  State<ResortListScreen> createState() => _ResortListScreenState();
}

class _ResortListScreenState extends State<ResortListScreen> {
  List<dynamic> resorts = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadResorts();
  }

  Future<void> _loadResorts() async {
    try {
      final response = await http.get(Uri.parse('https://vizagresortbooking.in/api/resorts'));
      if (response.statusCode == 200) {
        setState(() {
          resorts = json.decode(response.body);
          isLoading = false;
        });
      } else {
        throw Exception('Failed to load resorts');
      }
    } catch (e) {
      setState(() => isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Available Resorts'),
        backgroundColor: const Color(0xFF667eea),
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : resorts.isEmpty
              ? const Center(child: Text('No resorts available'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: resorts.length,
                  itemBuilder: (context, index) {
                    final resort = resorts[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (resort['image'] != null && resort['image'].isNotEmpty)
                            Image.network(
                              resort['image'],
                              height: 200,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  Container(
                                    height: 200,
                                    color: Colors.grey[300],
                                    child: const Icon(Icons.hotel, size: 50),
                                  ),
                            ),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  resort['name'] ?? 'Resort',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(resort['location'] ?? ''),
                                const SizedBox(height: 8),
                                Text(
                                  '₹${resort['price']?.toString() ?? '0'}/night',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF667eea),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(resort['description'] ?? ''),
                                const SizedBox(height: 12),
                                ElevatedButton(
                                  onPressed: resort['available'] == 1
                                      ? () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) => BookingFormScreen(resort: resort),
                                            ),
                                          );
                                        }
                                      : null,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF667eea),
                                  ),
                                  child: Text(
                                    resort['available'] == 1 ? 'Book Now' : 'Not Available',
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}