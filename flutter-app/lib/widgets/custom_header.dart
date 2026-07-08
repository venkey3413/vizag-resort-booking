import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../utils/app_colors.dart';

class CustomHeader extends StatelessWidget {
  final VoidCallback? onNotificationTap;
  final VoidCallback? onProfileTap;
  final VoidCallback? onLocationTap;
  final String location;

  const CustomHeader({
    super.key,
    this.onNotificationTap,
    this.onProfileTap,
    this.onLocationTap,
    this.location = 'Visakhapatnam, Andhra Pradesh',
  });

  Future<void> _openOwnerDashboard() async {
    const url = 'https://vshakago.in/owner-dashboard';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      // Website's teal-blue brand gradient — matches public/index.html,
      // instead of a photo background.
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.gradientStart, AppColors.gradientEnd],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ---- Top row: logo + brand, notifications + account ----
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.asset(
                          'assets/logo.png',
                          width: 34,
                          height: 34,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(Icons.villa, color: Colors.white, size: 30),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'VshakaGo',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.2,
                            ),
                          ),
                          Text(
                            'Resorts for every moment',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.white.withOpacity(0.85),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      _HeaderIconButton(
                        icon: Icons.notifications_outlined,
                        showBadge: true,
                        onTap: onNotificationTap ?? () {},
                        label: 'Notifications',
                      ),
                      const SizedBox(width: 10),
                      _HeaderIconButton(
                        icon: Icons.person_outline,
                        onTap: onProfileTap ?? () {},
                        label: 'My Account',
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // ---- Location row ----
              InkWell(
                onTap: onLocationTap ?? () {},
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.white, size: 18),
                    const SizedBox(width: 4),
                    Text(
                      location,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_down, color: Colors.white, size: 18),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ---- Partner promo headline ----
              const Text(
                'Partner with VshakaGo',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const Text(
                'Grow Your Resort Business',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'More bookings. More visibility. More revenue.',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withOpacity(0.9),
                ),
              ),

              const SizedBox(height: 16),

              // ---- Become a Partner / Partner Login buttons ----
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _openOwnerDashboard,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                        elevation: 0,
                      ),
                      icon: const Text('🤝', style: TextStyle(fontSize: 16)),
                      label: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Become a Partner',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          SizedBox(width: 4),
                          Icon(Icons.arrow_forward, size: 15),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _openOwnerDashboard,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white, width: 1.4),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                      ),
                      icon: const Icon(Icons.login, size: 16),
                      label: const Text('Partner Login',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool showBadge;
  final String label;

  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    required this.label,
    this.showBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Material(
          color: Colors.white,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(9),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, color: AppColors.primaryDark, size: 20),
                  if (showBadge)
                    Positioned(
                      right: -1,
                      top: -1,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
