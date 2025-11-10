import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class BookingFormScreen extends StatefulWidget {
  final Map<String, dynamic> resort;

  const BookingFormScreen({super.key, required this.resort});

  @override
  State<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends State<BookingFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  
  DateTime? _checkInDate;
  DateTime? _checkOutDate;
  int _guests = 1;
  bool _isLoading = false;

  double get _totalPrice {
    if (_checkInDate == null || _checkOutDate == null) return 0;
    final nights = _checkOutDate!.difference(_checkInDate!).inDays;
    final basePrice = (widget.resort['price'] ?? 0).toDouble() * nights;
    final platformFee = basePrice * 0.015;
    return basePrice + platformFee;
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
          _checkInDate = picked;
          if (_checkOutDate != null && _checkOutDate!.isBefore(picked)) {
            _checkOutDate = null;
          }
        } else {
          _checkOutDate = picked;
        }
      });
    }
  }

  Future<void> _submitBooking() async {
    if (!_formKey.currentState!.validate() || _checkInDate == null || _checkOutDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final nights = _checkOutDate!.difference(_checkInDate!).inDays;
      final basePrice = (widget.resort['price'] ?? 0).toDouble() * nights;
      final platformFee = basePrice * 0.015;

      final bookingData = {
        'resort_id': widget.resort['id'],
        'guest_name': _nameController.text,
        'email': _emailController.text,
        'phone': _phoneController.text,
        'check_in': DateFormat('yyyy-MM-dd').format(_checkInDate!),
        'check_out': DateFormat('yyyy-MM-dd').format(_checkOutDate!),
        'guests': _guests,
        'base_price': basePrice,
        'platform_fee': platformFee,
        'total_price': basePrice + platformFee,
      };

      final response = await ApiService.createBooking(bookingData);
      
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Booking Successful!'),
            content: Text('Booking Reference: ${response['booking_reference']}\nTotal: ₹${_totalPrice.toStringAsFixed(0)}'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Resort'),
        backgroundColor: const Color(0xFF667eea),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.resort['name'] ?? 'Resort', 
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text('₹${widget.resort['price']}/night'),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full Name *', border: OutlineInputBorder()),
                validator: (value) => value?.isEmpty == true ? 'Name required' : null,
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email *', border: OutlineInputBorder()),
                validator: (value) => value?.isEmpty == true ? 'Email required' : null,
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Phone *', border: OutlineInputBorder()),
                validator: (value) => value?.isEmpty == true ? 'Phone required' : null,
              ),
              
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(context, true),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(border: Border.all(), borderRadius: BorderRadius.circular(4)),
                        child: Text(_checkInDate == null ? 'Check-in *' : DateFormat('dd/MM/yyyy').format(_checkInDate!)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(context, false),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(border: Border.all(), borderRadius: BorderRadius.circular(4)),
                        child: Text(_checkOutDate == null ? 'Check-out *' : DateFormat('dd/MM/yyyy').format(_checkOutDate!)),
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Guests:'),
                  Row(
                    children: [
                      IconButton(onPressed: _guests > 1 ? () => setState(() => _guests--) : null, icon: const Icon(Icons.remove)),
                      Text('$_guests'),
                      IconButton(onPressed: () => setState(() => _guests++), icon: const Icon(Icons.add)),
                    ],
                  ),
                ],
              ),
              
              if (_checkInDate != null && _checkOutDate != null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${_checkOutDate!.difference(_checkInDate!).inDays} nights'),
                            Text('₹${((widget.resort['price'] ?? 0) * _checkOutDate!.difference(_checkInDate!).inDays).toStringAsFixed(0)}'),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Platform fee (1.5%)'),
                            Text('₹${(_totalPrice - ((widget.resort['price'] ?? 0) * _checkOutDate!.difference(_checkInDate!).inDays)).toStringAsFixed(0)}'),
                          ],
                        ),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text('₹${_totalPrice.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              
              const SizedBox(height: 24),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitBooking,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF667eea), padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Book Now', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}