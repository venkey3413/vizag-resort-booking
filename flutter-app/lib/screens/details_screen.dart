import 'package:flutter/material.dart';
import '../models/resort.dart';
import 'booking_screen_razorpay.dart';
import 'debug_pricing_screen.dart';

class DetailsScreen extends StatelessWidget {
  final Resort resort;

  const DetailsScreen({super.key, required this.resort});

  Widget _buildDynamicPricingInfo() {
    final weekday = resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekday',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );
    final weekend = resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekend',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );

    return Column(
      children: [
        if (weekday.price > 0)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Weekday (Mon-Fri):',
                  style: TextStyle(fontSize: 14)),
              Text('₹${weekday.price}',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
        if (weekday.price > 0 && weekend.price > 0) const SizedBox(height: 4),
        if (weekend.price > 0)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Weekend (Sat-Sun):',
                  style: TextStyle(fontSize: 14)),
              Text('₹${weekend.price}',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(resort.name),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          // Debug button - remove in production
          IconButton(
            icon: const Icon(Icons.bug_report),
            tooltip: 'Debug Pricing',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DynamicPricingDebugScreen(resort: resort),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Image.network(
              "https://vshakago.in${resort.image}",
              height: 250,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  height: 250,
                  color: Colors.grey[300],
                  child: const Icon(Icons.image_not_supported, size: 80),
                );
              },
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    resort.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: Colors.red),
                      const SizedBox(width: 4),
                      Text(
                        resort.location,
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              resort.dynamicPricing.isNotEmpty
                                  ? "Starting from:"
                                  : "Price per night:",
                              style: const TextStyle(fontSize: 16),
                            ),
                            Text(
                              "₹${resort.price.toStringAsFixed(0)}",
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),
                        if (resort.dynamicPricing.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          const Divider(),
                          const SizedBox(height: 4),
                          _buildDynamicPricingInfo(),
                        ],
                      ],
                    ),
                  ),
                  if (resort.description != null) ...[
                    const SizedBox(height: 16),
                    const Text(
                      "Description",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      resort.description!,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                  if (resort.amenities != null && resort.amenities!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text(
                      "Amenities",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: resort.amenities!.split(',').map((amenity) {
                        return Chip(
                          label: Text(amenity.trim()),
                          backgroundColor: Colors.blue[100],
                        );
                      }).toList(),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BookingScreen(resort: resort),
                          ),
                        );
                      },
                      child: const Text(
                        "Book Now",
                        style: TextStyle(fontSize: 18),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
