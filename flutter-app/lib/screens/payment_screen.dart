import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
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
  File? _screenshotFile;
  bool _isUploadingScreenshot = false;

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

  Future<void> _pickScreenshot(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 85);
      if (picked != null) {
        setState(() => _screenshotFile = File(picked.path));
      }
    } catch (e) {
      _showMessage('Could not pick image: $e');
    }
  }

  void _showScreenshotSourceSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppColors.primary),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickScreenshot(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: AppColors.primary),
              title: const Text('Take a Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickScreenshot(ImageSource.camera);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmPaymentAndBook() async {
    final utr = _utrController.text.trim();
    if (utr.isEmpty) {
      _showMessage('Please enter the UTR / Transaction ID from your payment.');
      return;
    }
    if (!RegExp(r'^\d{12}$').hasMatch(utr)) {
      _showMessage('UTR must be exactly 12 digits. Please check your payment confirmation and re-enter.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      String? screenshotUrl;

      // Upload the payment screenshot to Cloudinary first, if one was picked.
      if (_screenshotFile != null) {
        setState(() => _isUploadingScreenshot = true);
        try {
          screenshotUrl = await ApiService.uploadPaymentScreenshot(_screenshotFile!, _pendingReference);
        } catch (e) {
          if (!mounted) return;
          setState(() {
            _isSubmitting = false;
            _isUploadingScreenshot = false;
          });
          _showMessage('Screenshot upload failed: ${e.toString().replaceAll('Exception: ', '')}. Please try again.');
          return;
        }
        if (!mounted) return;
        setState(() => _isUploadingScreenshot = false);
      }

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
        if (screenshotUrl != null) "paymentScreenshotUrl": screenshotUrl,
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
            const SizedBox(height: 12),

            // QR code — same static merchant QR used on the website
            Center(
              child: Column(
                children: [
                  const Text('Scan QR Code', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Image.asset(
                      'assets/upi-qr-code.png',
                      width: 190,
                      height: 190,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 190,
                        height: 190,
                        alignment: Alignment.center,
                        child: const Icon(Icons.qr_code_2, size: 60, color: AppColors.textMuted),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Copyable UPI ID
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_balance_wallet_outlined, size: 18, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('UPI ID', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        Text(_upiId, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      Clipboard.setData(const ClipboardData(text: _upiId));
                      _showMessage('UPI ID copied to clipboard');
                    },
                    icon: const Icon(Icons.copy, size: 15),
                    label: const Text('Copy', style: TextStyle(fontSize: 12.5)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),
            const Text('Or Pay with an App', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
            const SizedBox(height: 10),

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
                labelText: 'UTR / Transaction ID (12 digits)',
                hintText: 'e.g. 123456789012',
                counterText: '',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
              ),
              keyboardType: TextInputType.number,
              maxLength: 12,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
              ],
            ),

            const SizedBox(height: 20),
            const Text('Upload Payment Screenshot', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textDark)),
            const SizedBox(height: 4),
            const Text(
              'Optional but recommended — helps us verify your payment faster.',
              style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
            ),
            const SizedBox(height: 10),
            _screenshotFile == null
                ? InkWell(
                    onTap: _showScreenshotSourceSheet,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 22),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                      ),
                      child: const Column(
                        children: [
                          Icon(Icons.add_a_photo_outlined, color: AppColors.primary, size: 26),
                          SizedBox(height: 6),
                          Text('Tap to add screenshot', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary)),
                        ],
                      ),
                    ),
                  )
                : Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          _screenshotFile!,
                          width: double.infinity,
                          height: 180,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        right: 6,
                        top: 6,
                        child: InkWell(
                          onTap: () => setState(() => _screenshotFile = null),
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                            child: const Icon(Icons.close, color: Colors.white, size: 16),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 6,
                        bottom: 6,
                        child: TextButton.icon(
                          onPressed: _showScreenshotSourceSheet,
                          style: TextButton.styleFrom(backgroundColor: Colors.black54, foregroundColor: Colors.white),
                          icon: const Icon(Icons.refresh, size: 15),
                          label: const Text('Change', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                    ],
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
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                          const SizedBox(width: 10),
                          Text(_isUploadingScreenshot ? 'Uploading screenshot...' : 'Booking...', style: const TextStyle(fontSize: 13)),
                        ],
                      )
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
