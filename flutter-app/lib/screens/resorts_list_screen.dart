import 'package:flutter/material.dart';
import '../models/resort.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../widgets/resort_card_enhanced.dart';
import 'details_screen_enhanced.dart';

class ResortsListScreen extends StatefulWidget {
  const ResortsListScreen({super.key});

  @override
  State<ResortsListScreen> createState() => _ResortsListScreenState();
}

class _ResortsListScreenState extends State<ResortsListScreen> {
  int _refreshKey = 0;

  Future<void> _refresh() async {
    setState(() => _refreshKey++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Popular Resorts in Vizag'),
        backgroundColor: AppColors.gradientStart,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.primary,
        child: FutureBuilder<List<Resort>>(
          key: ValueKey(_refreshKey),
          future: ApiService.getResorts(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: AppColors.primary));
            }

            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 50, color: AppColors.danger),
                      const SizedBox(height: 12),
                      Text('Error: ${snapshot.error}',
                          style: const TextStyle(color: AppColors.textLight, fontSize: 13),
                          textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => setState(() {}),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              );
            }

            if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.villa_outlined, size: 60, color: AppColors.textLight),
                    SizedBox(height: 12),
                    Text('No resorts available',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textLight)),
                  ],
                ),
              );
            }

            final resorts = snapshot.data!;
            return ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 12),
              itemCount: resorts.length,
              itemBuilder: (context, index) {
                final resort = resorts[index];
                return ResortCardEnhanced(
                  resort: resort,
                  onTap: () {
                    Navigator.push(
                      context,
                      PageRouteBuilder(
                        pageBuilder: (context, animation, secondaryAnimation) =>
                            DetailsScreenEnhanced(resort: resort),
                        transitionsBuilder: (context, animation, secondaryAnimation, child) {
                          const begin = Offset(1.0, 0.0);
                          const end = Offset.zero;
                          const curve = Curves.easeInOut;
                          var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
                          return SlideTransition(position: animation.drive(tween), child: child);
                        },
                      ),
                    );
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}
