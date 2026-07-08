import 'package:flutter/material.dart';

class AppColors {
  // Matches the actual website's brand colors (public/index.html)
  static const primary = Color(0xFF2F8FE0);       // website's link/accent blue
  static const primaryDark = Color(0xFF1E5F74);   // website's teal-blue gradient start
  static const primaryDarker = Color(0xFF2D7A92); // website's teal-blue gradient end
  static const secondary = Color(0xFF6C757D);
  static const success = Color(0xFF10B981);       // website's green (offers badge)
  static const danger = Color(0xFFDC3545);
  static const warning = Color(0xFFFFC107);
  static const info = Color(0xFF0DCAF0);

  // Background colors with gradient
  static const background = Color(0xFFF8F9FA);
  static const cardBackground = Colors.white;

  // Website header/hero gradient (teal-blue), used instead of any photo background
  static const gradientStart = Color(0xFF1E5F74);
  static const gradientEnd = Color(0xFF2D7A92);

  // Orange gradient for buttons (matches website's CTA/offer banner orange)
  static const orangeStart = Color(0xFFFF5E3A);
  static const orangeEnd = Color(0xFFFF9D3D);

  // Text colors
  static const textDark = Color(0xFF212529);
  static const textLight = Color(0xFF6C757D);
  static const textMuted = Color(0xFF868E96);

  // Shadow
  static const cardShadow = Color(0x14000000);

  // Border
  static const border = Color(0xFFDEE2E6);
}

class AppConstants {
  static const double borderRadius = 16.0;
  static const double cardElevation = 4.0;
  static const double spacing = 16.0;
  static const double spacingSmall = 8.0;
  static const double spacingLarge = 24.0;
}
