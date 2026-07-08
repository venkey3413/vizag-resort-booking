import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/event.dart';
import '../utils/app_colors.dart';

// Reuses the existing /api/events endpoint (same table used by EventsScreen),
// filtered server-side to event_type containing "birthday". To show venues
// here, an admin just needs to create an Event in the admin panel with an
// event_type like "Birthday Party" — no separate feature/table needed.
class BirthdaySection extends StatelessWidget {
  final VoidCallback? onViewAll;
  const BirthdaySection({super.key, this.onViewAll});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Text('Birthday Celebrations',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                  SizedBox(width: 6),
                  Text('🎂', style: TextStyle(fontSize: 18)),
                ],
              ),
              GestureDetector(
                onTap: onViewAll ?? () {},
                child: const Text('View All',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 240,
          child: FutureBuilder<List<Event>>(
            future: ApiService.getEvents(type: 'birthday'),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: AppColors.primary));
              }
              if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Center(
                    child: Text(
                      snapshot.hasError
                          ? 'Could not load birthday venues right now.'
                          : 'No birthday venues added yet — check back soon!',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                    ),
                  ),
                );
              }

              final venues = snapshot.data!;
              return ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: venues.length,
                itemBuilder: (context, index) {
                  final venue = venues[index];
                  return Container(
                    width: 190,
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 14, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                              child: Image.network(
                                venue.image,
                                height: 110,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => Container(
                                  height: 110,
                                  color: AppColors.background,
                                  child: const Icon(Icons.cake_outlined, color: AppColors.primary),
                                ),
                              ),
                            ),
                            Positioned(
                              right: 8,
                              top: 8,
                              child: Container(
                                padding: const EdgeInsets.all(5),
                                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                                child: const Icon(Icons.favorite_border, size: 14, color: AppColors.textLight),
                              ),
                            ),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(venue.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(Icons.location_on, size: 11, color: AppColors.textMuted),
                                  const SizedBox(width: 2),
                                  Expanded(
                                    child: Text(venue.location,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 10.5, color: AppColors.textMuted)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('₹${venue.price} / event',
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                              const SizedBox(height: 3),
                              const Text('View Details',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
