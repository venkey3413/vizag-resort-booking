import 'package:flutter/material.dart';
import '../models/resort.dart';

class ResortCard extends StatelessWidget {
  final Resort resort;
  final VoidCallback onTap;

  const ResortCard({
    super.key,
    required this.resort,
    required this.onTap,
  });

  String _getPricingDetails() {
    final weekday = resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekday',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );
    final weekend = resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekend',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );
    
    if (weekday.price > 0 && weekend.price > 0) {
      return 'Weekday: ₹${weekday.price} | Weekend: ₹${weekend.price}';
    } else if (weekday.price > 0) {
      return 'Weekday: ₹${weekday.price}';
    } else if (weekend.price > 0) {
      return 'Weekend: ₹${weekend.price}';
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(12),
              ),
              child: Image.network(
                "https://vshakago.in${resort.image}",
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 180,
                    color: Colors.grey[300],
                    child: const Icon(
                      Icons.image_not_supported,
                      size: 50,
                      color: Colors.grey,
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    resort.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          resort.location,
                          style: TextStyle(color: Colors.grey[600]),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              resort.dynamicPricing.isNotEmpty
                                  ? "From ₹${resort.price.toStringAsFixed(0)}/night"
                                  : "₹${resort.price.toStringAsFixed(0)}/night",
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                            if (resort.dynamicPricing.isNotEmpty)
                              Text(
                                _getPricingDetails(),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[600],
                                ),
                              ),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: onTap,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text("View Details"),
                      ),
                    ],
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
