import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class BirthdayVenue {
  final String name;
  final String location;
  final String price;
  final double rating;
  final String imageUrl;

  const BirthdayVenue({
    required this.name,
    required this.location,
    required this.price,
    required this.rating,
    required this.imageUrl,
  });
}

// NOTE: static placeholder data for now — wire this up to a real
// "birthday celebration venues" endpoint once one exists on the backend.
const List<BirthdayVenue> _sampleVenues = [
  BirthdayVenue(
    name: 'Birthday Bash Resort',
    location: 'Madhurawada, Vizag',
    price: '₹4,999 / event',
    rating: 4.6,
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80',
  ),
  BirthdayVenue(
    name: 'Party House Resort',
    location: 'Kapilthuppada, Vizag',
    price: '₹3,499 / event',
    rating: 4.4,
    imageUrl: 'https://images.unsplash.com/photo-1464349153735-e3b7a8988bea?w=600&q=80',
  ),
  BirthdayVenue(
    name: 'Royal Celebration Villa',
    location: 'Pendurthi, Visakhapatnam',
    price: '₹5,499 / event',
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600&q=80',
  ),
];

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
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _sampleVenues.length,
            itemBuilder: (context, index) {
              final venue = _sampleVenues[index];
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
                            venue.imageUrl,
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
                          left: 8,
                          bottom: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.success,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, color: Colors.white, size: 11),
                                const SizedBox(width: 2),
                                Text(venue.rating.toString(),
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                              ],
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
                          Text(venue.price,
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
          ),
        ),
      ],
    );
  }
}
