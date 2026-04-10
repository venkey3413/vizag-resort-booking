import 'package:flutter/material.dart';
import '../models/resort.dart';
import '../services/api_service.dart';

class BookingScreen extends StatefulWidget {
  final Resort resort;

  const BookingScreen({super.key, required this.resort});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final _formKey = GlobalKey<FormState>();
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final phoneController = TextEditingController();
  final guestsController = TextEditingController(text: "2");
  
  DateTime? checkInDate;
  DateTime? checkOutDate;
  bool isLoading = false;
  int? calculatedTotal;
  int? nightlyRate;
  int? numberOfNights;

  void _calculateTotal() {
    print('🔍 _calculateTotal called');
    print('checkInDate: $checkInDate');
    print('checkOutDate: $checkOutDate');
    
    if (checkInDate == null || checkOutDate == null) {
      setState(() {
        calculatedTotal = null;
        nightlyRate = null;
        numberOfNights = null;
      });
      return;
    }

    final nights = checkOutDate!.difference(checkInDate!).inDays;
    final checkInDayOfWeek = checkInDate!.weekday; // 1=Monday, 7=Sunday
    int rate = widget.resort.price;

    print('nights: $nights');
    print('checkInDayOfWeek: $checkInDayOfWeek (${_getDayName(checkInDayOfWeek)})');
    print('base rate: $rate');
    print('dynamicPricing count: ${widget.resort.dynamicPricing.length}');
    
    // Debug: Print all available pricing
    for (var pricing in widget.resort.dynamicPricing) {
      print('  Available pricing: ${pricing.dayType} = ₹${pricing.price}');
    }

    if (widget.resort.dynamicPricing.isNotEmpty) {
      // Monday-Friday (1-5) = weekday, Saturday-Sunday (6-7) = weekend
      if (checkInDayOfWeek == 6 || checkInDayOfWeek == 7) {
        // Weekend
        print('✅ Weekend detected (${_getDayName(checkInDayOfWeek)})');
        final weekendPrice = widget.resort.dynamicPricing.firstWhere(
          (p) => p.dayType == 'weekend',
          orElse: () => DynamicPricing(dayType: '', price: 0),
        );
        print('weekendPrice found: ${weekendPrice.price}');
        if (weekendPrice.price > 0) {
          rate = weekendPrice.price;
          print('✅ Applied weekend rate: ₹$rate');
        } else {
          print('⚠️ Weekend price not found, using base rate');
        }
      } else {
        // Weekday
        print('✅ Weekday detected (${_getDayName(checkInDayOfWeek)})');
        final weekdayPrice = widget.resort.dynamicPricing.firstWhere(
          (p) => p.dayType == 'weekday',
          orElse: () => DynamicPricing(dayType: '', price: 0),
        );
        print('weekdayPrice found: ${weekdayPrice.price}');
        if (weekdayPrice.price > 0) {
          rate = weekdayPrice.price;
          print('✅ Applied weekday rate: ₹$rate');
        } else {
          print('⚠️ Weekday price not found, using base rate');
        }
      }
    } else {
      print('⚠️ No dynamic pricing available, using base rate: ₹$rate');
    }

    final basePrice = rate * nights;
    final platformFee = (basePrice * 0.015).round();
    final total = basePrice + platformFee;

    print('💰 Final calculation:');
    print('  Rate per night: ₹$rate');
    print('  Number of nights: $nights');
    print('  Base price: ₹$basePrice');
    print('  Platform fee (1.5%): ₹$platformFee');
    print('  Total: ₹$total');

    setState(() {
      nightlyRate = rate;
      numberOfNights = nights;
      calculatedTotal = total;
    });
  }
  
  String _getDayName(int weekday) {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[weekday];
  }
  
  String _getAppliedRate() {
    if (checkInDate == null || widget.resort.dynamicPricing.isEmpty) {
      return '₹${widget.resort.price}/night';
    }
    
    final checkInDayOfWeek = checkInDate!.weekday;
    
    if (checkInDayOfWeek == 6 || checkInDayOfWeek == 7) {
      // Weekend
      final weekendPrice = widget.resort.dynamicPricing.firstWhere(
        (p) => p.dayType == 'weekend',
        orElse: () => DynamicPricing(dayType: '', price: 0),
      );
      if (weekendPrice.price > 0) {
        return '₹${weekendPrice.price}/night (Weekend Rate)';
      }
    } else {
      // Weekday
      final weekdayPrice = widget.resort.dynamicPricing.firstWhere(
        (p) => p.dayType == 'weekday',
        orElse: () => DynamicPricing(dayType: '', price: 0),
      );
      if (weekdayPrice.price > 0) {
        return '₹${weekdayPrice.price}/night (Weekday Rate)';
      }
    }
    
    return '₹${widget.resort.price}/night (Base Rate)';
  }

  List<Widget> _buildPricingRows() {
    List<Widget> rows = [];
    
    final weekday = widget.resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekday',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );
    final weekend = widget.resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekend',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );

    if (weekday.price > 0) {
      rows.add(
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Weekday (Mon-Fri):', style: TextStyle(fontSize: 13)),
            Text('₹${weekday.price}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    if (weekend.price > 0) {
      rows.add(
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Weekend (Sat-Sun):', style: TextStyle(fontSize: 13)),
            Text('₹${weekend.price}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    return rows;
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
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          checkInDate = picked;
          // Reset checkout if it's before new checkin
          if (checkOutDate != null && checkOutDate!.isBefore(picked)) {
            checkOutDate = null;
          }
        } else {
          checkOutDate = picked;
        }
      });
      _calculateTotal();
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return "Select Date";
    return "${date.day}/${date.month}/${date.year}";
  }

  void _showSuccessDialog(String bookingReference) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text("Booking Successful!"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Your booking has been submitted successfully."),
            const SizedBox(height: 12),
            Text(
              "Booking Reference: $bookingReference",
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Please complete the payment to confirm your booking.",
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pop(); // Go back to details
              Navigator.of(context).pop(); // Go back to home
            },
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Booking Failed"),
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

  Future<void> _submitBooking() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (checkInDate == null || checkOutDate == null) {
      _showErrorDialog("Please select check-in and check-out dates");
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      // Format dates as YYYY-MM-DD
      final checkIn = "${checkInDate!.year}-${checkInDate!.month.toString().padLeft(2, '0')}-${checkInDate!.day.toString().padLeft(2, '0')}";
      final checkOut = "${checkOutDate!.year}-${checkOutDate!.month.toString().padLeft(2, '0')}-${checkOutDate!.day.toString().padLeft(2, '0')}";

      // Calculate nights and total price with dynamic pricing
      // Use check-in date to determine pricing (same as website)
      final nights = checkOutDate!.difference(checkInDate!).inDays;
      
      // Get pricing based on check-in date's day of week (matching website logic)
      final checkInDayOfWeek = checkInDate!.weekday; // 1=Monday, 7=Sunday
      int nightlyRate = widget.resort.price;
      
      if (widget.resort.dynamicPricing.isNotEmpty) {
        // Monday-Friday (1-5) = weekday, Saturday-Sunday (6-7) = weekend
        if (checkInDayOfWeek == 6 || checkInDayOfWeek == 7) {
          // Weekend (Saturday=6, Sunday=7)
          final weekendPrice = widget.resort.dynamicPricing.firstWhere(
            (p) => p.dayType == 'weekend',
            orElse: () => DynamicPricing(dayType: '', price: 0),
          );
          if (weekendPrice.price > 0) {
            nightlyRate = weekendPrice.price;
          }
        } else {
          // Weekday (Monday=1 to Friday=5)
          final weekdayPrice = widget.resort.dynamicPricing.firstWhere(
            (p) => p.dayType == 'weekday',
            orElse: () => DynamicPricing(dayType: '', price: 0),
          );
          if (weekdayPrice.price > 0) {
            nightlyRate = weekdayPrice.price;
          }
        }
      }
      
      final basePrice = nightlyRate * nights;
      final platformFee = (basePrice * 0.015).round();
      final totalPrice = basePrice + platformFee;

      final bookingData = {
        "resortId": widget.resort.id,
        "guestName": nameController.text.trim(),
        "email": emailController.text.trim(),
        "phone": phoneController.text.trim(),
        "checkIn": checkIn,
        "checkOut": checkOut,
        "guests": int.parse(guestsController.text),
        "totalPrice": totalPrice,
      };

      final response = await ApiService.bookResort(bookingData);

      setState(() {
        isLoading = false;
      });

      if (response['bookingReference'] != null) {
        _showSuccessDialog(response['bookingReference']);
      } else {
        _showErrorDialog("Booking created but no reference received");
      }
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      _showErrorDialog(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Book Resort"),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Resort Info Card
              Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          "https://vshakago.in${widget.resort.image}",
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
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
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              widget.resort.location,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13),
                            ),
                            if (widget.resort.dynamicPricing.isNotEmpty)
                              Text(
                                "From ₹${widget.resort.price}/night",
                                style: const TextStyle(
                                  color: Colors.blue,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              )
                            else
                              Text(
                                "₹${widget.resort.price}/night",
                                style: const TextStyle(
                                  color: Colors.blue,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Dynamic Pricing Info
              if (widget.resort.dynamicPricing.isNotEmpty)
                Card(
                  elevation: 1,
                  color: Colors.blue[50],
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "📅 Dynamic Pricing",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ..._buildPricingRows(),
                        const SizedBox(height: 4),
                        Text(
                          "Price based on check-in date",
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[700],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                        if (checkInDate != null)
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.green[100],
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.green[300]!),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.check_circle, color: Colors.green[700], size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    "Selected: ${_getDayName(checkInDate!.weekday)} - ${_getAppliedRate()}",
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.green[900],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

              const SizedBox(height: 12),

              // Guest Details
              const Text(
                "Guest Details",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: "Full Name",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return "Please enter your name";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: "Email",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
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
              const SizedBox(height: 12),

              TextFormField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Phone Number",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                  hintText: "+919876543210",
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return "Please enter your phone number";
                  }
                  if (!value.startsWith('+91')) {
                    return "Phone must start with +91";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Booking Details
              const Text(
                "Booking Details",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(context, true),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: "Check-in",
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.calendar_today),
                        ),
                        child: Text(_formatDate(checkInDate)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(context, false),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: "Check-out",
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.calendar_today),
                        ),
                        child: Text(_formatDate(checkOutDate)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: guestsController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: "Number of Guests",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.people),
                ),
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

              // Price Summary Card
              if (calculatedTotal != null)
                Card(
                  elevation: 2,
                  color: Colors.green[50],
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "💰 Price Summary",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "₹$nightlyRate × $numberOfNights night${numberOfNights! > 1 ? 's' : ''}",
                              style: const TextStyle(fontSize: 14),
                            ),
                            Text(
                              "₹${(nightlyRate! * numberOfNights!).toStringAsFixed(0)}",
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              "Platform fee (1.5%)",
                              style: TextStyle(fontSize: 14),
                            ),
                            Text(
                              "₹${((nightlyRate! * numberOfNights!) * 0.015).round()}",
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              "Total",
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              "₹${calculatedTotal!.toStringAsFixed(0)}",
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: isLoading ? null : _submitBooking,
                  child: isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          "Confirm Booking",
                          style: TextStyle(fontSize: 18),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
