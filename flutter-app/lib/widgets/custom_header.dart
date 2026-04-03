import 'dart:ui';
import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class CustomHeader extends StatelessWidget {
  final VoidCallback? onSearchTap;
  final VoidCallback? onProfileTap;

  const CustomHeader({
    super.key,
    this.onSearchTap,
    this.onProfileTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF0A74DA).withOpacity(0.92),
            const Color(0xFF1AA3FF).withOpacity(0.82),
            const Color(0xFF764BA2).withOpacity(0.78),
          ],
        ),
        border: Border(
          bottom: BorderSide(
            color: Colors.white.withOpacity(0.2),
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.18),
            blurRadius: 50,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Logo and Brand
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.35),
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.24),
                              blurRadius: 30,
                              offset: const Offset(0, 14),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.asset(
                            'assets/logo.png',
                            width: 45,
                            height: 45,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 45,
                                height: 45,
                                color: Colors.white,
                                child: const Icon(
                                  Icons.villa,
                                  color: Color(0xFF0A74DA),
                                  size: 26,
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'VshakaGo',
                        style: TextStyle(
                          fontSize: 7,
                          fontWeight: FontWeight.w600,
                          color: Colors.white.withOpacity(0.9),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),

                  // Action Buttons
                  Row(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(25),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.2),
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(25),
                            onTap: onSearchTap ?? () {},
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              child: Text(
                                'WhatsApp',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF6F00), Color(0xFFFF9A3C)],
                          ),
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFF6F00).withOpacity(0.35),
                              blurRadius: 40,
                              offset: const Offset(0, 18),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(25),
                            onTap: onProfileTap ?? () {},
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              child: Text(
                                'Book Now',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
