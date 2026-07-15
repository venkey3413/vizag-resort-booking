import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';

class ServiceItem {
  final String label;
  final IconData icon;
  final LinearGradient gradient;
  final VoidCallback onTap;

  ServiceItem({
    required this.label,
    required this.icon,
    required this.gradient,
    required this.onTap,
  });
}

class EnhancedServicesGrid extends StatelessWidget {
  final VoidCallback? onResortsTap;
  final VoidCallback? onNearMeTap;
  final VoidCallback? onSupportTap;
  final VoidCallback? onInteriorTap;
  final VoidCallback? onPestControlTap;
  final VoidCallback? onEventsTap;
  final VoidCallback? onCabsTap;
  final VoidCallback? onFoodTap;

  const EnhancedServicesGrid({
    super.key,
    this.onResortsTap,
    this.onNearMeTap,
    this.onSupportTap,
    this.onInteriorTap,
    this.onPestControlTap,
    this.onEventsTap,
    this.onCabsTap,
    this.onFoodTap,
  });

  @override
  Widget build(BuildContext context) {
    final services = [
      ServiceItem(
        label: 'Resorts',
        icon: Icons.villa_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFF6C5CE7), Color(0xFF5F3DC4)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onResortsTap ?? () {},
      ),
      ServiceItem(
        label: 'Near Me',
        icon: Icons.near_me_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFF2F8FE0), Color(0xFF1E5BA8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onNearMeTap ?? () {},
      ),
      ServiceItem(
        label: 'Support',
        icon: Icons.headset_mic_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFFE84393), Color(0xFFC91F69)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onSupportTap ?? () {},
      ),
      ServiceItem(
        label: 'Interior Works',
        icon: Icons.chair_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFFE1A100), Color(0xFFB8860B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onInteriorTap ?? () {},
      ),
      ServiceItem(
        label: 'Pest Control',
        icon: Icons.cleaning_services_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFF10B981), Color(0xFF059669)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onPestControlTap ?? () {},
      ),
      ServiceItem(
        label: 'Events',
        icon: Icons.calendar_month_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFF6C5CE7), Color(0xFF5F3DC4)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onEventsTap ?? () {},
      ),
      ServiceItem(
        label: 'Cabs & Travel',
        icon: Icons.directions_car_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFF2F8FE0), Color(0xFF1E5BA8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onCabsTap ?? () {},
      ),
      ServiceItem(
        label: 'Food Orders',
        icon: Icons.restaurant_outlined,
        gradient: const LinearGradient(
          colors: [Color(0xFFE84393), Color(0xFFC91F69)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        onTap: onFoodTap ?? () {},
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Text(
            'Our Services',
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
            children: services
                .map((service) => _ServiceTile(service: service))
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _ServiceTile extends StatefulWidget {
  final ServiceItem service;

  const _ServiceTile({required this.service});

  @override
  State<_ServiceTile> createState() => _ServiceTileState();
}

class _ServiceTileState extends State<_ServiceTile>
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
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(
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
    widget.service.onTap();
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
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: widget.service.gradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: widget.service.gradient.colors[0].withOpacity(0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Shine effect
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Colors.white.withOpacity(0.3),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  // Icon
                  Center(
                    child: Icon(
                      widget.service.icon,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.service.label,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151),
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
