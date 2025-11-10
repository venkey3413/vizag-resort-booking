import 'package:flutter/material.dart';
import 'screens/resort_list_screen.dart';
import 'screens/food_order_screen.dart';
import 'screens/help_screen.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  runApp(const VizagApp());
}

class VizagApp extends StatelessWidget {
  const VizagApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Vizag Resort Booking',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        scaffoldBackgroundColor: const Color(0xFFF8F9FA),
        fontFamily: 'Inter',
        textTheme: const TextTheme(
          bodyLarge: TextStyle(fontFamily: 'Inter'),
          bodyMedium: TextStyle(fontFamily: 'Inter'),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with TickerProviderStateMixin {
  late AnimationController _bannerController;
  late PageController _pageController;
  int _currentBannerIndex = 0;
  int _currentNavIndex = 0;

  final List<Map<String, String>> banners = [
    {
      'title': 'Welcome to Vizag',
      'subtitle': 'Beautiful Beach Resorts',
      'gradient': '0xFF667eea,0xFF764ba2'
    },
    {
      'title': 'Luxury Stays',
      'subtitle': 'Premium Resort Experience',
      'gradient': '0xFF667eea,0xFFff6b6b'
    },
    {
      'title': 'Book Now',
      'subtitle': 'Best Prices Guaranteed',
      'gradient': '0xFF764ba2,0xFFffa500'
    },
  ];

  @override
  void initState() {
    super.initState();
    _bannerController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    );
    _pageController = PageController();
    _startBannerRotation();
  }

  void _startBannerRotation() {
    _bannerController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() {
          _currentBannerIndex = (_currentBannerIndex + 1) % banners.length;
        });
        _bannerController.reset();
        _bannerController.forward();
      }
    });
    _bannerController.forward();
  }

  @override
  void dispose() {
    _bannerController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 50,
        backgroundColor: const Color(0xFF667eea),
        elevation: 2,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF667eea), Color(0xFF764ba2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(25),
                border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 28,
                  height: 28,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.hotel, color: Colors.white, size: 20),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Vizag Resort Booking',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Hero Section with Rotating Banners
            Container(
              height: 200,
              width: double.infinity,
              child: AnimatedBuilder(
                animation: _bannerController,
                builder: (context, child) {
                  final currentBanner = banners[_currentBannerIndex];
                  final gradientColors = currentBanner['gradient']!.split(',');
                  return Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(int.parse(gradientColors[0])),
                          Color(int.parse(gradientColors[1])),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.beach_access, color: Colors.white, size: 50),
                          const SizedBox(height: 12),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 500),
                            child: Text(
                              currentBanner['title']!,
                              key: ValueKey(currentBanner['title']),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Inter',
                                shadows: [
                                  Shadow(
                                    offset: Offset(1, 1),
                                    blurRadius: 3,
                                    color: Colors.black26,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 500),
                            child: Text(
                              currentBanner['subtitle']!,
                              key: ValueKey(currentBanner['subtitle']),
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 16,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            
            const SizedBox(height: 24),
            
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Our Services',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Inter',
                      color: Color(0xFF333333),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
            
                  // Service Grid
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.85,
                    children: [
                      _buildServiceTile(Icons.hotel, 'Book Resort', const Color(0xFFff6b6b), () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const ResortListScreen()),
                        );
                      }),
                      _buildServiceTile(Icons.restaurant, 'Food Order', const Color(0xFF28a745), () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const FoodOrderScreen()),
                        );
                      }),
                      _buildServiceTile(Icons.directions_car, 'Travel', const Color(0xFF007bff), () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Travel booking coming soon!')),
                        );
                      }),
                      _buildServiceTile(Icons.celebration, 'Events', const Color(0xFF6f42c1), () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Event booking coming soon!')),
                        );
                      }),
                      _buildServiceTile(Icons.phone_android, 'Recharge', const Color(0xFFfd7e14), () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Recharge coming soon!')),
                        );
                      }),
                      _buildServiceTile(Icons.sports_cricket, 'Cricket', const Color(0xFF17a2b8), () async {
                        final url = Uri.parse('https://www.cricbuzz.com');
                        if (await canLaunchUrl(url)) {
                          await launchUrl(url, mode: LaunchMode.externalApplication);
                        }
                      }),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Info Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 15,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Why Choose Vizag Resorts?',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Inter',
                            color: Color(0xFF333333),
                          ),
                        ),
                        SizedBox(height: 12),
                        Text('• Beautiful beachfront locations', style: TextStyle(fontFamily: 'Inter')),
                        Text('• 24/7 customer support', style: TextStyle(fontFamily: 'Inter')),
                        Text('• Best price guarantee', style: TextStyle(fontFamily: 'Inter')),
                        Text('• Easy booking & cancellation', style: TextStyle(fontFamily: 'Inter')),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentNavIndex,
        onTap: (index) {
          setState(() => _currentNavIndex = index);
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ResortListScreen()),
            );
          } else if (index == 2) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const HelpScreen()),
            );
          }
        },
        selectedItemColor: const Color(0xFF667eea),
        unselectedItemColor: Colors.grey,
        backgroundColor: Colors.white,
        elevation: 8,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.build),
            label: 'Services',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.help_outline),
            label: 'Help',
          ),
        ],
      ),
    );
  }

  Widget _buildServiceTile(IconData icon, String title, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                fontFamily: 'Inter',
                color: Color(0xFF333333),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}