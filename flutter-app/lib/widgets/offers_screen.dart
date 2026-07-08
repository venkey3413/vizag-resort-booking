import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';

class OffersScreen extends StatelessWidget {
  const OffersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offers & Coupons'),
        backgroundColor: AppColors.gradientStart,
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<List<dynamic>>(
        future: ApiService.getCoupons(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          }
          if (snapshot.hasError) {
            return Center(
              child: Text('Could not load offers: ${snapshot.error}',
                  style: const TextStyle(color: AppColors.textLight)),
            );
          }
          final coupons = snapshot.data ?? [];
          if (coupons.isEmpty) {
            return const Center(
              child: Text('No active offers right now — check back soon!',
                  style: TextStyle(color: AppColors.textMuted)),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: coupons.length,
            itemBuilder: (context, index) {
              final c = coupons[index] as Map<String, dynamic>;
              final code = c['code']?.toString() ?? '';
              final isPercentage = c['type']?.toString() == 'percentage';
              final discount = isPercentage ? '${c['discount']}% OFF' : '₹${c['discount']} OFF';
              final dayType = c['day_type']?.toString() ?? 'all';
              final dayLabel = dayType == 'all'
                  ? 'Valid on all days'
                  : 'Valid on ${dayType[0].toUpperCase()}${dayType.substring(1)}${dayType == 'weekend' || dayType == 'weekday' ? 's' : ''}';
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.success.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(discount,
                          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.success, fontSize: 13)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(code,
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.textDark)),
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(dayLabel,
                                style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
                          ),
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
    );
  }
}
