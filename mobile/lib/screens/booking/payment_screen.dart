import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';

class PaymentScreen extends StatefulWidget {
  final String bookingReference;
  final double totalAmount;

  const PaymentScreen({
    super.key,
    required this.bookingReference,
    required this.totalAmount,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _utrController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submitPaymentProof() async {
    if (_utrController.text.length != 12) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('UTR must be 12 digits')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final success = await ApiService.submitPaymentProof(
        widget.bookingReference,
        _utrController.text,
      );

      if (success && mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Text('Payment Submitted'),
            content: Text('Your payment proof has been submitted for booking ${widget.bookingReference}. You will receive confirmation once verified.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to submit payment proof')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Booking Details
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Booking Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text('Booking Reference: ${widget.bookingReference}'),
                    Text('Total Amount: ₹${widget.totalAmount.toStringAsFixed(0)}'),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Payment Instructions
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Payment Instructions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text('1. Scan the QR code below or use UPI ID'),
                    const Text('2. Pay ₹${widget.totalAmount}'),
                    const Text('3. Enter the 12-digit UTR number from your payment'),
                    const Text('4. Submit for verification'),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // QR Code Placeholder
            Center(
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.qr_code, size: 100, color: Colors.grey),
                    Text('UPI QR Code'),
                    Text('vizagresorts@paytm'),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // UTR Input
            TextField(
              controller: _utrController,
              decoration: const InputDecoration(
                labelText: 'Enter 12-digit UTR Number',
                border: OutlineInputBorder(),
                helperText: 'Found in your payment confirmation SMS/app',
              ),
              keyboardType: TextInputType.number,
              maxLength: 12,
            ),
            
            const SizedBox(height: 24),
            
            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitPaymentProof,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Submit Payment Proof', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}