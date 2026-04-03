import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/resort.dart';
import '../utils/app_colors.dart';
import '../widgets/custom_header.dart';
import '../widgets/resort_card_enhanced.dart';
import 'details_screen_enhanced.dart';

class HomeScreenEnhanced extends StatelessWidget {
  const HomeScreenEnhanced({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Custom Header (matching website)
          CustomHeader(
            onSearchTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Search feature coming soon')),
              );
            },
            onProfileTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Profile feature coming soon')),
              );
            },
          ),

          // Content
          Expanded(
            child: FutureBuilder<List<Resort>>(
              future: ApiService.getResorts(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primary,
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 60,
                          color: AppColors.danger,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Error: ${snapshot.error}',
                          style: const TextStyle(color: AppColors.textLight),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            (context as Element).markNeedsBuild();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                          ),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.villa_outlined,
                          size: 80,
                          color: AppColors.textLight,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No resorts available',
                          style: TextStyle(
                            fontSize: 18,
                            color: AppColors.textLight,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final resorts = snapshot.data!;

                return ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 16),
                  itemCount: resorts.length,
                  itemBuilder: (context, index) {
                    final resort = resorts[index];

                    return ResortCardEnhanced(
                      resort: resort,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                DetailsScreenEnhanced(resort: resort),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
