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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Logo and Brand
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.villa,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'VShakago',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 18,
                    color: AppColors.textDark,
                  ),
                ),
              ],
            ),

            // Action Icons
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.search, size: 22),
                  color: AppColors.textDark,
                  onPressed: onSearchTap ?? () {},
                ),
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(Icons.person_outline, size: 22),
                  color: AppColors.textDark,
                  onPressed: onProfileTap ?? () {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
