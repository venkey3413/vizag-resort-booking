import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'booking/resort_list_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<String> _banners = [
    'assets/images/banner1.jpg',
    'assets/images/banner2.jpg',
    'assets/images/banner3.jpg',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        // reduced height header with logo on the left and menu icon on right
        toolbarHeight: 64,
        titleSpacing: 0,
        title: Row(
          children: [
            const SizedBox(width: 12),
            CircleAvatar(
              radius: 20,
              backgroundColor: Colors.white,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset('assets/images/logo.png', fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 12),
            const Text('Vizag Resort Booking'),
            const Spacer(),
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.menu, color: Colors.white),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Carousel
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    CarouselSlider(
                      items: _banners.map((path) {
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.asset(path, fit: BoxFit.cover, width: double.infinity),
                        );
                      }).toList(),
                      options: CarouselOptions(
                        height: 180,
                        viewportFraction: 1.0,
                        autoPlay: true,
                        autoPlayInterval: const Duration(seconds: 4),
                        enlargeCenterPage: false,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // Service icons grid
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.9,
                children: [
                  _serviceTile(Icons.hotel, 'Book Resort', AppColors.accent),
                  _serviceTile(Icons.sports_cricket, 'Live Cricket Score', Colors.green),
                  _serviceTile(Icons.location_city, 'Hotels', Colors.amber),
                  _serviceTile(Icons.celebration, 'Events', Colors.deepOrangeAccent),
                  _serviceTile(Icons.phone_android, 'Recharges', Colors.purple),
                  _serviceTile(Icons.restaurant, 'Food Order', Colors.redAccent),
                ],
              ),

              const SizedBox(height: 20),
              // placeholder for extra services
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('More Services', style: TextStyle(fontWeight: FontWeight.w600)),
                    SizedBox(height: 8),
                    Text('You can add additional services here: Packages, Cab Booking, Deals, etc.'),
                  ],
                ),
              ),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        selectedItemColor: AppColors.primary,
        unselectedItemColor: Colors.grey[600],
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.build), label: 'Services'),
          BottomNavigationBarItem(icon: Icon(Icons.help_outline), label: 'Help'),
        ],
      ),
    );
  }

  Widget _serviceTile(IconData icon, String label, Color bg) {
    return GestureDetector(
      onTap: () {
        if (label == 'Book Resort') {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ResortListScreen()),
          );
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: bg.withOpacity(0.95),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(height: 10),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.deepText)),
          ],
        ),
      ),
    );
  }
}