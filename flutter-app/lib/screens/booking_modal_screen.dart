import 'dart:ui';
import 'package:flutter/material.dart';
import '../models/resort.dart';
import 'payment_screen.dart';

class BookingModalScreen extends StatefulWidget {
  final Resort resort;

  const BookingModalScreen({super.key, required this.resort});

  @override
  State<BookingModalScreen> createState() => _BookingModalScreenState();
}

class _BookingModalScreenState extends State<BookingModalScreen> {
  final _formKey = GlobalKey<FormState>();
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final phoneController = TextEditingController(text: "+91");
  final guestsController = TextEditingController(text: "2");
  
  DateTime? checkInDate;
  DateTime? checkOutDate;

  @override
  void initState() {
    super.initState();
    print('\n🏨 Booking modal opened for: ${widget.resort.name}');
    print('   Base price: ₹${widget.resort.price}');
    print('   Dynamic pricing entries: ${widget.resort.dynamicPricing.length}');
    if (widget.resort.dynamicPricing.isNotEmpty) {
      for (var pricing in widget.resort.dynamicPricing) {
        print('      - ${pricing.dayType}: ₹${pricing.price}');
      }
    }
    print('   👉 Select a check-in date to see dynamic pricing in action\n');
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    guestsController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context, bool isCheckIn) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn 
          ? DateTime.now().add(const Duration(days: 1))
          : (checkInDate?.add(const Duration(days: 1)) ?? DateTime.now().add(const Duration(days: 2))),
      firstDate: isCheckIn 
          ? DateTime.now()
          : (checkInDate ?? DateTime.now()),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          checkInDate = picked;
          if (checkOutDate != null && checkOutDate!.isBefore(picked.add(const Duration(days: 1)))) {
            checkOutDate = null;
          }
        } else {
          checkOutDate = picked;
        }
      });
      
      // Trigger price calculation with logging
      print('\n📅 Date selected - triggering price calculation');
      final price = _calculateTotalPrice();
      print('📊 UI will show: ₹$price\n');
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return "Select Date";
    return "${date.day}/${date.month}/${date.year}";
  }

  int _calculateTotalPrice() {
    if (checkInDate == null || checkOutDate == null) return 0;
    
    final nights = checkOutDate!.difference(checkInDate!).inDays;
    int totalBasePrice = 0;
    
    print('🔍 Calculating price for ${widget.resort.name}');
    print('   Check-in: ${checkInDate!.day}/${checkInDate!.month}/${checkInDate!.year}');
    print('   Check-out: ${checkOutDate!.day}/${checkOutDate!.month}/${checkOutDate!.year}');
    print('   Total nights: $nights');
    print('   Dynamic pricing available: ${widget.resort.dynamicPricing.isNotEmpty}');
    
    // Calculate price for each night individually
    for (int i = 0; i < nights; i++) {
      final currentNight = checkInDate!.add(Duration(days: i));
      final dayOfWeek = currentNight.weekday; // 1=Monday, 7=Sunday
      int nightlyRate = widget.resort.price;
      
      // Apply dynamic pricing based on each night's day of week
      if (widget.resort.dynamicPricing.isNotEmpty) {
        if (dayOfWeek == 5) {
          // Friday (Dart weekday: Monday=1 ... Friday=5)
          final fridayPrice = widget.resort.dynamicPricing.firstWhere(
            (p) => p.dayType == 'friday',
            orElse: () => DynamicPricing(dayType: '', price: 0),
          );
          if (fridayPrice.price > 0) {
            nightlyRate = fridayPrice.price;
            print('   Night ${i + 1} (${_getDayName(dayOfWeek)}): ₹$nightlyRate (Friday)');
          } else {
            // No specific Friday rate set — fall back to weekday rate
            final weekdayPrice = widget.resort.dynamicPricing.firstWhere(
              (p) => p.dayType == 'weekday',
              orElse: () => DynamicPricing(dayType: '', price: 0),
            );
            if (weekdayPrice.price > 0) nightlyRate = weekdayPrice.price;
            print('   Night ${i + 1} (${_getDayName(dayOfWeek)}): ₹$nightlyRate (Weekday - no Friday rate set)');
          }
        } else if (dayOfWeek == 6 || dayOfWeek == 7) {
          // Weekend (Saturday=6, Sunday=7)
          final weekendPrice = widget.resort.dynamicPricing.firstWhere(
            (p) => p.dayType == 'weekend',
            orElse: () => DynamicPricing(dayType: '', price: 0),
          );
          if (weekendPrice.price > 0) {
            nightlyRate = weekendPrice.price;
          }
          print('   Night ${i + 1} (${_getDayName(dayOfWeek)}): ₹$nightlyRate (Weekend)');
        } else {
          // Weekday (Monday=1 to Thursday=4)
          final weekdayPrice = widget.resort.dynamicPricing.firstWhere(
            (p) => p.dayType == 'weekday',
            orElse: () => DynamicPricing(dayType: '', price: 0),
          );
          if (weekdayPrice.price > 0) {
            nightlyRate = weekdayPrice.price;
          }
          print('   Night ${i + 1} (${_getDayName(dayOfWeek)}): ₹$nightlyRate (Weekday)');
        }
      } else {
        print('   Night ${i + 1} (${_getDayName(dayOfWeek)}): ₹$nightlyRate (Base rate)');
      }
      
      totalBasePrice += nightlyRate;
    }
    
    final platformFee = (totalBasePrice * 0.015).round();
    final total = totalBasePrice + platformFee;
    
    print('   💰 Total base: ₹$totalBasePrice + Platform fee: ₹$platformFee = Total: ₹$total\n');
    
    return total;
  }
  
  String _getDayName(int weekday) {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[weekday];
  }

  Future<void> _proceedToPayment() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (checkInDate == null || checkOutDate == null) {
      _showErrorDialog("Please select check-in and check-out dates");
      return;
    }

    final checkIn = "${checkInDate!.year}-${checkInDate!.month.toString().padLeft(2, '0')}-${checkInDate!.day.toString().padLeft(2, '0')}";
    final checkOut = "${checkOutDate!.year}-${checkOutDate!.month.toString().padLeft(2, '0')}-${checkOutDate!.day.toString().padLeft(2, '0')}";
    final totalPrice = _calculateTotalPrice();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentScreen(
          resort: widget.resort,
          guestName: nameController.text.trim(),
          email: emailController.text.trim(),
          phone: phoneController.text.trim(),
          checkIn: checkIn,
          checkOut: checkOut,
          guests: int.parse(guestsController.text),
          totalPrice: totalPrice,
        ),
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red[600], size: 32),
            const SizedBox(width: 12),
            const Text("Error"),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nights = (checkInDate != null && checkOutDate != null)
        ? checkOutDate!.difference(checkInDate!).inDays
        : 0;
    final totalPrice = _calculateTotalPrice();

    return Scaffold(
      backgroundColor: Colors.black.withOpacity(0.6),
      body: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: SafeArea(
          child: Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.97),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.28),
                    blurRadius: 110,
                    offset: const Offset(0, 30),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      color: const Color(0xFF0F172A).withOpacity(0.03),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Confirm Booking',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Secure booking with instant confirmation',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 20),
                            onPressed: () => Navigator.pop(context),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(14),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A).withOpacity(0.03),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: const Color(0xFF0F172A).withOpacity(0.10),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Image.network(
                                        widget.resort.image.startsWith('http')
                                            ? widget.resort.image
                                            : "https://vshakago.in${widget.resort.image}",
                                        width: 70,
                                        height: 70,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) {
                                          return Container(
                                            width: 70,
                                            height: 70,
                                            color: Colors.grey[300],
                                            child: const Icon(Icons.image),
                                          );
                                        },
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            widget.resort.name,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w900,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            widget.resort.location,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Color(0xFF64748B),
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '₹${widget.resort.price}/night',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: nameController,
                                decoration: InputDecoration(
                                  labelText: "Full Name",
                                  labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return "Please enter your name";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 10),
                              TextFormField(
                                controller: emailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: InputDecoration(
                                  labelText: "Email",
                                  labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return "Please enter your email";
                                  }
                                  if (!value.contains('@')) {
                                    return "Please enter a valid email";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 10),
                              TextFormField(
                                controller: phoneController,
                                keyboardType: TextInputType.phone,
                                decoration: InputDecoration(
                                  labelText: "Phone Number",
                                  labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                                  hintText: "+919876543210",
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                                onChanged: (value) {
                                  if (!value.startsWith('+91')) {
                                    phoneController.value = TextEditingValue(
                                      text: '+91',
                                      selection: TextSelection.collapsed(offset: 3),
                                    );
                                  }
                                },
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return "Please enter your phone number";
                                  }
                                  if (!value.startsWith('+91')) {
                                    return "Phone must start with +91";
                                  }
                                  if (value.length != 13) {
                                    return "Please enter 10 digits after +91";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => _selectDate(context, true),
                                      child: Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.12)),
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text("Check-in", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B))),
                                            const SizedBox(height: 4),
                                            Text(_formatDate(checkInDate), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: checkInDate == null ? Colors.grey : Colors.black)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: InkWell(
                                      onTap: checkInDate == null ? null : () => _selectDate(context, false),
                                      child: Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: checkInDate == null ? Colors.grey[300]! : const Color(0xFF0F172A).withOpacity(0.12)),
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text("Check-out", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: checkInDate == null ? Colors.grey[300] : const Color(0xFF64748B))),
                                            const SizedBox(height: 4),
                                            Text(_formatDate(checkOutDate), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: checkOutDate == null ? Colors.grey : Colors.black)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              TextFormField(
                                controller: guestsController,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: "Number of Guests",
                                  labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return "Please enter number of guests";
                                  }
                                  final guests = int.tryParse(value);
                                  if (guests == null || guests < 1) {
                                    return "Please enter a valid number";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              if (nights > 0) ...[
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0F172A).withOpacity(0.03),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.10)),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text("Base Amount", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                          Text("₹${totalPrice - (totalPrice * 0.015).round()}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text("Platform Fee", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                          Text("₹${(totalPrice * 0.015).round()}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                        ],
                                      ),
                                      const Divider(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text("Total Pay", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                                          Text("₹${totalPrice.toStringAsFixed(0)}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF28a745),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    elevation: 0,
                                  ),
                                  onPressed: _proceedToPayment,
                                  child: const Text('Proceed to Payment', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                                ),
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFdc3545),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    elevation: 0,
                                  ),
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Cancel', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Center(
                                child: Text(
                                  '✅ Coupon supported • ✅ Secure Payment • ✅ Instant Confirmation',
                                  style: TextStyle(fontSize: 9, color: Color(0xFF64748B), fontWeight: FontWeight.w800),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
