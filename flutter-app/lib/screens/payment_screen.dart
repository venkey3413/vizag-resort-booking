import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/resort.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';

class PaymentScreen extends StatefulWidget {
  final Resort resort;
  final String guestName;
  final String email;
  final String phone;
  final String checkIn;
  final String checkOut;
  final int guests;
  final int totalPrice;

  const PaymentScreen({
    super.key,
    required this.resort,
    required this.guestName,
    required this.email,
    required this.phone,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.totalPrice,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  // Client-side reference shown in the UPI payment note and to the guest
  // during payment — the REAL booking + final reference are only created
  // server-side once the UTR is submitted below (mirrors public/critical.js).
  late final String _pendingReference;
  final _utrController = TextEditingController();
  bool _isSubmitting = false;

  static const String _upiId = 'vshakago@ybl';
  static const String _merchantName = 'VshakaGo';

  @override
  void initState() {
    super.initState();
    _pendingReference = 'VE${DateTime.now().millisecondsSinceEpoch.toString().padLeft(12, '0')}';
  }

  @override
  void dispose() {
    _utrController.dispose();
    super.dispose();
  }

  Future<void> _payWithUpiApp(String? package) async {
    final amount = widget.totalPrice;
    final upiUrl =
        'upi://pay?pa=$_upiId&pn=$_merchantName&am=$amount&cu=INR&tn=$_pendingReference';
    final uri = Uri.parse(upiUrl);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        _showMessage('No UPI app found. Please install PhonePe, Google Pay, or Paytm.');
      }
    } catch (e) {
      if (mounted) {
        _showMessage('Could not open UPI app: $e');
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _confirmPaymentAndBook() async {
    final utr = _utrController.text.trim();
    if (utr.isEmpty) {
      _showMessage('Please enter the UTR / Transaction ID from your payment.');
      return;
    }
    if (utr.length < 6) {
      _showMessage('That doesn\'t look like a valid UTR. Please check and re-enter.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final bookingData = {
        "resortId": widget.resort.id,
        "guestName": widget.guestName,
        "email": widget.email,
        "phone": widget.phone,
        "checkIn": widget.checkIn,
        "checkOut": widget.checkOut,
        "guests": widget.guests,
        "totalPrice": widget.totalPrice,
        "transactionId": utr,
      };

      final response = await ApiService.bookResort(bookingData);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (response['bookingReference'] != null) {
        _showSuccessDialog(response['bookingReference']);
      } else {
        _showMessage('Booking created but no reference received — please contact support.');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      _showMessage(e.toString().replaceAll('Exception: ', ''));
    }
  }

  void _showSuccessDialog(String bookingReference) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green[600], size: 32),
            const SizedBox(width: 12),
            const Text("Booking Confirmed!"),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Your booking has been confirmed successfully."),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(8)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Booking Reference:", style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(bookingReference,
                      style: TextStyle(fontSize: 18, color: Colors.blue[700], fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              // Pop payment screen, booking modal, and details screen back to the resort list.
              Navigator.of(context).pop();
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Complete Payment'),
        backgroundColor: AppColors.gradientStart,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Amount due card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.gradientStart, AppColors.gradientEnd]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Amount to Pay', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('₹${widget.totalPrice}',
                      style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text('${widget.resort.name} • ${widget.checkIn} to ${widget.checkOut}',
                      style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                ],
              ),
            ),

            const SizedBox(height: 20),
            const Text('Pay via UPI', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textDark)),
            const SizedBox(height: 4),
            Text('UPI ID: $_upiId', style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(child: _UpiAppButton(label: 'PhonePe', color: const Color(0xFF5F259F), onTap: () => _payWithUpiApp('phonepe'))),
                const SizedBox(width: 10),
                Expanded(child: _UpiAppButton(label: 'Google Pay', color: const Color(0xFF4285F4), onTap: () => _payWithUpiApp('gpay'))),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _UpiAppButton(label: 'Paytm', color: const Color(0xFF00BAF2), onTap: () => _payWithUpiApp('paytm'))),
                const SizedBox(width: 10),
                Expanded(child: _UpiAppButton(label: 'Other UPI App', color: AppColors.textDark, onTap: () => _payWithUpiApp(null))),
              ],
            ),

            const SizedBox(height: 24),
            const Text('Enter Payment Details', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textDark)),
            const SizedBox(height: 8),
            Text(
              'After paying, enter the UTR / Transaction ID from your UPI app (found in the payment confirmation screen or your bank SMS).',
              style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _utrController,
              decoration: InputDecoration(
                labelText: 'UTR / Transaction ID',
                hintText: 'e.g. 123456789012',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
              ),
              keyboardType: TextInputType.text,
            ),

            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _isSubmitting ? null : _confirmPaymentAndBook,
                child: _isSubmitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Confirm Payment & Book', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
              ),
            ),
            const SizedBox(height: 10),
            const Center(
              child: Text(
                '✅ Secure Payment • ✅ Instant Confirmation',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpiAppButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _UpiAppButton({required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color, width: 1.4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onPressed: onTap,
      child: Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
    );
  }
}
