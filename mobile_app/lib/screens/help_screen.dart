import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Help & Support'),
        backgroundColor: const Color(0xFF667eea),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Contact Us',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            
            Card(
              child: ListTile(
                leading: const Icon(Icons.phone, color: Color(0xFF667eea)),
                title: const Text('Call Us'),
                subtitle: const Text('+91 9876543210'),
                onTap: () => _launchUrl('tel:+919876543210'),
              ),
            ),
            
            Card(
              child: ListTile(
                leading: const Icon(Icons.email, color: Color(0xFF667eea)),
                title: const Text('Email Us'),
                subtitle: const Text('support@vizagresortbooking.in'),
                onTap: () => _launchUrl('mailto:support@vizagresortbooking.in'),
              ),
            ),
            
            Card(
              child: ListTile(
                leading: const Icon(Icons.web, color: Color(0xFF667eea)),
                title: const Text('Visit Website'),
                subtitle: const Text('vizagresortbooking.in'),
                onTap: () => _launchUrl('https://vizagresortbooking.in'),
              ),
            ),
            
            const SizedBox(height: 24),
            
            const Text(
              'FAQ',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            
            const ExpansionTile(
              title: Text('How to book a resort?'),
              children: [
                Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Tap on "Book Resort", select your preferred resort, fill in the details, and complete the payment.'),
                ),
              ],
            ),
            
            const ExpansionTile(
              title: Text('What is the cancellation policy?'),
              children: [
                Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Free cancellation up to 24 hours before check-in. After that, 50% of the booking amount will be charged.'),
                ),
              ],
            ),
            
            const ExpansionTile(
              title: Text('How to contact customer support?'),
              children: [
                Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('You can call us, email us, or visit our website for 24/7 customer support.'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}