import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/resort.dart';
import '../utils/app_colors.dart';
import 'details_screen_enhanced.dart';

// Derives destinations from the existing /api/resorts data (grouped by
// location) rather than needing a separate destinations table/endpoint.
class DestinationsScreen extends StatelessWidget {
  const DestinationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Destinations'),
        backgroundColor: AppColors.gradientStart,
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<List<Resort>>(
        future: ApiService.getResorts(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          }
          if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(
              child: Text('No destinations available right now.',
                  style: TextStyle(color: AppColors.textMuted)),
            );
          }

          // Group resorts by location
          final Map<String, List<Resort>> byLocation = {};
          for (final resort in snapshot.data!) {
            byLocation.putIfAbsent(resort.location, () => []).add(resort);
          }
          final locations = byLocation.keys.toList()..sort();

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: locations.length,
            itemBuilder: (context, index) {
              final location = locations[index];
              final resorts = byLocation[location]!;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: ExpansionTile(
                  leading: const Icon(Icons.place, color: AppColors.primary),
                  title: Text(location,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  subtitle: Text('${resorts.length} resort${resorts.length > 1 ? 's' : ''}',
                      style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
                  children: resorts.map((resort) {
                    return ListTile(
                      title: Text(resort.name),
                      subtitle: Text('₹${resort.price} / night'),
                      trailing: const Icon(Icons.chevron_right, size: 18),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => DetailsScreenEnhanced(resort: resort)),
                        );
                      },
                    );
                  }).toList(),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
