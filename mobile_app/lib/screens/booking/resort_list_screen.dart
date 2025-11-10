import 'package:flutter/material.dart';
import '../../models/resort.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import 'resort_detail_screen.dart';

class ResortListScreen extends StatefulWidget {
  const ResortListScreen({super.key});

  @override
  State<ResortListScreen> createState() => _ResortListScreenState();
}

class _ResortListScreenState extends State<ResortListScreen> {
  List<Resort> resorts = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadResorts();
  }

  Future<void> _loadResorts() async {
    try {
      final data = await ApiService.getResorts();
      setState(() {
        resorts = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading resorts: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Available Resorts')),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: resorts.length,
              itemBuilder: (context, index) {
                final resort = resorts[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ResortDetailScreen(resort: resort),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                          child: Image.network(
                            resort.image,
                            height: 200,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Container(height: 200, color: Colors.grey[300]),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                resort.name,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(resort.location, style: TextStyle(color: Colors.grey[600])),
                              const SizedBox(height: 8),
                              Text(
                                '₹${resort.price.toStringAsFixed(0)}/night',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}