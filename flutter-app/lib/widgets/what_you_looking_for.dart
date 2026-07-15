import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';

class WhatYouLookingFor extends StatelessWidget {
  final VoidCallback? onResortTap;
  final VoidCallback? onBirthdayTap;
  final VoidCallback? onEventsTap;
  final VoidCallback? onPartiesTap;
  final VoidCallback? onPhotoshootTap;
  final VoidCallback? onDiningTap;
  final VoidCallback? onDecorationsTap;
  final VoidCallback? onSurpriseTap;

  const WhatYouLookingFor({
    super.key,
    this.onResortTap,
    this.onBirthdayTap,
    this.onEventsTap,
    this.onPartiesTap,
    this.onPhotoshootTap,
    this.onDiningTap,
    this.onDecorationsTap,
    this.onSurpriseTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Text(
            'What are you looking for?',
            style: GoogleFonts.poppins(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF1F2937),
              letterSpacing: -0.3,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: GridView.count(
            crossAxisCount: 4,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _CategoryItem(
                icon: Icons.restaurant,
                label: 'Resorts',
                gradient: const LinearGradient(
                  colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onResortTap,
              ),
              _CategoryItem(
                icon: Icons.cake,
                label: 'Birthday',
                gradient: const LinearGradient(
                  colors: [Color(0xFFF43F5E), Color(0xFFE11D48)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onBirthdayTap,
              ),
              _CategoryItem(
                icon: Icons.celebration,
                label: 'Events',
                gradient: const LinearGradient(
                  colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onEventsTap,
              ),
              _CategoryItem(
                icon: Icons.music_note,
                label: 'Parties',
                gradient: const LinearGradient(
                  colors: [Color(0xFFA78BFA), Color(0xFF7C3AED)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onPartiesTap,
              ),
              _CategoryItem(
                icon: Icons.camera_alt,
                label: 'Photoshoot',
                gradient: const LinearGradient(
                  colors: [Color(0xFF60A5FA), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onPhotoshootTap,
              ),
              _CategoryItem(
                icon: Icons.restaurant_menu,
                label: 'Dining',
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onDiningTap,
              ),
              _CategoryItem(
                icon: Icons.local_florist,
                label: 'Decorations',
                gradient: const LinearGradient(
                  colors: [Color(0xFFFB923C), Color(0xFFF97316)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onDecorationsTap,
              ),
              _CategoryItem(
                icon: Icons.card_giftcard,
                label: 'Surprise',
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F766E), Color(0xFF134E4A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                onTap: onSurpriseTap,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoryItem extends StatefulWidget {
  final IconData icon;
  final String label;
  final LinearGradient gradient;
  final VoidCallback? onTap;

  const _CategoryItem({
    required this.icon,
    required this.label,
    required this.gradient,
    this.onTap,
  });

  @override
  State<_CategoryItem> createState() => _CategoryItemState();
}

class _CategoryItemState extends State<_CategoryItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    _controller.reverse();
    widget.onTap?.call();
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: widget.gradient,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: widget.gradient.colors[0].withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Shine effect
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Colors.white.withOpacity(0.25),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  // Icon
                  Center(
                    child: Icon(
                      widget.icon,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.label,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
