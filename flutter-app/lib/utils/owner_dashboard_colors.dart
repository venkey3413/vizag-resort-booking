import 'package:flutter/material.dart';

class OwnerDashboardColors {
  // Main colors from website
  static const blueDark = Color(0xFF0D3B6E);
  static const blue = Color(0xFF1A5FA8);
  static const teal = Color(0xFF0A7A5A);
  static const tealLight = Color(0xFF14C88C);
  static const gold = Color(0xFFF5A623);
  static const red = Color(0xFFE53E3E);
  
  // Background colors
  static const bg = Color(0xFF0F1117);
  static const surface = Color(0xFF181B23);
  static const surface2 = Color(0xFF1E2130);
  
  // Border colors
  static const border = Color.fromRGBO(255, 255, 255, 0.07);
  static const border2 = Color.fromRGBO(255, 255, 255, 0.12);
  
  // Text colors
  static const text = Color(0xFFE8EAF0);
  static const text2 = Color(0xFF8B90A0);
  
  // Badge colors
  static const greenBg = Color.fromRGBO(52, 211, 153, 0.1);
  static const green = Color(0xFF34D399);
  static const redBg = Color.fromRGBO(248, 113, 113, 0.1);
  static const amberBg = Color.fromRGBO(251, 191, 36, 0.1);
  static const amber = Color(0xFFFBBF24);
  static const blueBg = Color.fromRGBO(79, 142, 255, 0.1);
  static const accent = Color(0xFF4F8EFF);
  
  // Gradients
  static const sidebarGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [blueDark, Color(0xFF0A1628)],
  );
  
  static const headerGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [blue, blueDark],
  );
}
