import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen_enhanced.dart';
import 'screens/login_screen.dart';
import 'utils/app_colors.dart';
import 'services/websocket_service.dart';
import 'services/notification_service.dart';

// Global key for navigator to show snackbars from anywhere
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp();
  await NotificationService.initialize();
  
  final prefs = await SharedPreferences.getInstance();
  final isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
  
  // Initialize WebSocket connection for real-time updates
  WebSocketService.connect(onMessage: (data) {
    final type = data['type'];
    print('📨 Real-time update received: $type');
    print('📊 Data: ${data['data']}');
    
    // Show notification for booking/resort updates
    if (type == 'booking.created' || 
        type == 'booking.updated' || 
        type == 'booking.deleted' ||
        type == 'resort.updated' ||
        type == 'resort.pricing.updated' ||
        type == 'resort.date.blocked' ||
        type == 'resort.date.unblocked') {
      
      print('🔔 Attempting to show notification for: $type');
      
      // Show snackbar notification
      Future.delayed(const Duration(milliseconds: 500), () {
        final context = navigatorKey.currentContext;
        if (context != null) {
          print('✅ Showing snackbar notification');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.notifications_active, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Real-time Update',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: Colors.white70,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            type == 'booking.created' ? '🎉 New booking!' :
                            type == 'booking.updated' ? '📝 Booking updated!' :
                            type == 'booking.deleted' ? '🗑️ Booking deleted!' :
                            type == 'resort.updated' ? '🏝️ Resort updated!' :
                            type == 'resort.pricing.updated' ? '💰 Price updated!' :
                            type == 'resort.date.blocked' ? '🚫 Date blocked!' :
                            type == 'resort.date.unblocked' ? '✅ Date unblocked!' :
                            '🔄 Data updated!',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              backgroundColor: const Color(0xFF1E88E5),
              duration: const Duration(seconds: 4),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              margin: const EdgeInsets.all(16),
              elevation: 8,
            ),
          );
        } else {
          print('⚠️ Navigator context is null, cannot show snackbar');
        }
      });
    }
  });
  
  runApp(MyApp(isLoggedIn: isLoggedIn));
}

class MyApp extends StatelessWidget {
  final bool isLoggedIn;
  
  const MyApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'VshakaGo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: AppColors.primary,
        scaffoldBackgroundColor: const Color(0xFFF5F7FA),
        useMaterial3: true,
        
        // Apply Poppins font globally
        textTheme: GoogleFonts.poppinsTextTheme().apply(
          bodyColor: AppColors.textDark,
          displayColor: AppColors.textDark,
        ),
        
        // AppBar theme
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        
        // Card theme
        cardTheme: const CardThemeData(
          elevation: 4,
          color: AppColors.cardBackground,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        
        // Elevated button theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            elevation: 8,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(25),
            ),
            textStyle: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        
        // Input decoration theme
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        
        // Color scheme
        colorScheme: ColorScheme.light(
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          error: AppColors.danger,
          background: AppColors.background,
          surface: AppColors.cardBackground,
        ),
        
        // Page transitions
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: CupertinoPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          },
        ),
      ),
      home: const SplashScreen(),
    );
  }
}
