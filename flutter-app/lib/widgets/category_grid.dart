import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class CategoryItem {
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final VoidCallback onTap;

  CategoryItem({
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.onTap,
  });
}

class CategoryGrid extends StatelessWidget {
  final VoidCallback? onResortsTap;
  final VoidCallback? onOffersTap;
  final VoidCallback? onEventsTap;

  const CategoryGrid({
    super.key,
    this.onResortsTap,
    this.onOffersTap,
    this.onEventsTap,
  });

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _comingSoon(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label — coming soon'), duration: const Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = <CategoryItem>[
      CategoryItem(
        label: 'Resorts',
        icon: Icons.villa_outlined,
        iconColor: const Color(0xFF6C5CE7),
        bgColor: const Color(0xFFEDEBFB),
        onTap: onResortsTap ?? () {},
      ),
      CategoryItem(
        label: 'Offers',
        icon: Icons.sell_outlined,
        iconColor: const Color(0xFF10B981),
        bgColor: const Color(0xFFE3F8EE),
        onTap: onOffersTap ?? () => _comingSoon(context, 'Offers'),
      ),
      CategoryItem(
        label: 'Destinations',
        icon: Icons.place_outlined,
        iconColor: const Color(0xFFFF7A45),
        bgColor: const Color(0xFFFFEDE3),
        onTap: () => _comingSoon(context, 'Destinations'),
      ),
      CategoryItem(
        label: 'Near Me',
        icon: Icons.near_me_outlined,
        iconColor: const Color(0xFF2F8FE0),
        bgColor: const Color(0xFFE4F1FC),
        onTap: () => _comingSoon(context, 'Near Me'),
      ),
      CategoryItem(
        label: 'Support',
        icon: Icons.headset_mic_outlined,
        iconColor: const Color(0xFFE84393),
        bgColor: const Color(0xFFFCE4EF),
        onTap: () => _openUrl('https://wa.me/message'),
      ),
      CategoryItem(
        label: 'Interior Works / Repairs',
        icon: Icons.chair_outlined,
        iconColor: const Color(0xFFE1A100),
        bgColor: const Color(0xFFFFF3D6),
        onTap: () => _openUrl('https://vshakago.in/vshinteriors/'),
      ),
      CategoryItem(
        label: 'Pest Control Service',
        icon: Icons.cleaning_services_outlined,
        iconColor: const Color(0xFF10B981),
        bgColor: const Color(0xFFE3F8EE),
        onTap: () => _comingSoon(context, 'Pest Control Service'),
      ),
      CategoryItem(
        label: 'Events',
        icon: Icons.calendar_month_outlined,
        iconColor: const Color(0xFF6C5CE7),
        bgColor: const Color(0xFFEDEBFB),
        onTap: onEventsTap ?? () {},
      ),
      CategoryItem(
        label: 'Cabs & Travel',
        icon: Icons.directions_car_outlined,
        iconColor: const Color(0xFF2F8FE0),
        bgColor: const Color(0xFFE4F1FC),
        onTap: () => _comingSoon(context, 'Cabs & Travel'),
      ),
      CategoryItem(
        label: 'Food Orders',
        icon: Icons.restaurant_outlined,
        iconColor: const Color(0xFFE84393),
        bgColor: const Color(0xFFFCE4EF),
        onTap: () => _comingSoon(context, 'Food Orders'),
      ),
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: GridView.count(
        crossAxisCount: 5,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 14,
        childAspectRatio: 0.72,
        children: items.map((item) => _CategoryTile(item: item)).toList(),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final CategoryItem item;
  const _CategoryTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: item.onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: item.bgColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(item.icon, color: item.iconColor, size: 22),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Text(
              item.label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Color(0xFF37474F),
                height: 1.15,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
