import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/event.dart';
import '../utils/app_colors.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  int _refreshKey = 0;

  Future<void> _refreshEvents() async {
    setState(() {
      _refreshKey++;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 8),
            Text('Events refreshed!'),
          ],
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Map<String, dynamic> _getEventTypeInfo(String eventType) {
    final Map<String, Map<String, dynamic>> eventTypeMap = {
      'birthday': {'name': 'Birthday Party', 'icon': '🎂', 'color': const Color(0xFFff6b6b)},
      'wedding': {'name': 'Wedding', 'icon': '💒', 'color': const Color(0xFFff8cc8)},
      'corporate': {'name': 'Corporate Event', 'icon': '🏢', 'color': const Color(0xFF4ecdc4)},
      'engagement': {'name': 'Engagement', 'icon': '💍', 'color': const Color(0xFFffe66d)},
      'pool-party': {'name': 'Pool Party', 'icon': '🏊', 'color': const Color(0xFF74b9ff)},
      'anniversary': {'name': 'Anniversary', 'icon': '🎉', 'color': const Color(0xFFfd79a8)},
    };
    
    return eventTypeMap[eventType] ?? {'name': 'Event', 'icon': '🎉', 'color': const Color(0xFF667eea)};
  }

  void _showBookingModal(Event event) {
    final eventInfo = _getEventTypeInfo(event.eventType);
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final phoneController = TextEditingController(text: '+91');
    final guestsController = TextEditingController(text: '50');
    DateTime selectedDate = DateTime.now();
    String? selectedTimeSlot;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFffffff), Color(0xFFf8fafc)],
            ),
            borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [eventInfo['color'], eventInfo['color'].withOpacity(0.7)],
                  ),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(25)),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Book ${eventInfo['name']}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close, color: Colors.white),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Text(
                            eventInfo['icon'],
                            style: const TextStyle(fontSize: 30),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  eventInfo['name'],
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  '📍 ${event.location}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.white.withOpacity(0.9),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildTextField('Full Name', nameController, Icons.person),
                      const SizedBox(height: 16),
                      _buildTextField('Email', emailController, Icons.email, keyboardType: TextInputType.emailAddress),
                      const SizedBox(height: 16),
                      _buildTextField('WhatsApp Number', phoneController, Icons.phone, keyboardType: TextInputType.phone),
                      const SizedBox(height: 16),
                      _buildTextField('Number of Guests', guestsController, Icons.people, keyboardType: TextInputType.number),
                      const SizedBox(height: 16),
                      
                      // Date Picker
                      InkWell(
                        onTap: () async {
                          final date = await showDatePicker(
                            context: context,
                            initialDate: selectedDate,
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                          );
                          if (date != null) {
                            setModalState(() {
                              selectedDate = date;
                            });
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today, color: Color(0xFF667eea)),
                              const SizedBox(width: 12),
                              Text(
                                'Event Date: ${selectedDate.day}/${selectedDate.month}/${selectedDate.year}',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Time Slot Dropdown
                      if (event.slotTimings != null && event.slotTimings!.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              hint: const Row(
                                children: [
                                  Icon(Icons.access_time, color: Color(0xFF667eea)),
                                  SizedBox(width: 12),
                                  Text('Select Time Slot', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                                ],
                              ),
                              value: selectedTimeSlot,
                              items: event.slotTimings!.split('\n').where((s) => s.trim().isNotEmpty).map((slot) {
                                return DropdownMenuItem(
                                  value: slot.trim(),
                                  child: Text(slot.trim(), style: const TextStyle(fontSize: 14)),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setModalState(() {
                                  selectedTimeSlot = value;
                                });
                              },
                            ),
                          ),
                        ),
                      ],
                      
                      const SizedBox(height: 20),
                      
                      // Price Summary
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [const Color(0xFFf8fafc), Colors.grey.shade100],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Event Price:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                                Text('₹${event.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                              ],
                            ),
                            const Divider(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                                Text('₹${event.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF667eea))),
                              ],
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 20),
                      
                      // Book Button
                      SizedBox(
                        width: double.infinity,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF667eea).withOpacity(0.3),
                                blurRadius: 15,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: () => _handleEventBooking(
                              event,
                              nameController.text,
                              emailController.text,
                              phoneController.text,
                              guestsController.text,
                              selectedDate,
                              selectedTimeSlot,
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Book Event Now',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {TextInputType? keyboardType}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: const Color(0xFF667eea)),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Future<void> _handleEventBooking(
    Event event,
    String name,
    String email,
    String phone,
    String guests,
    DateTime eventDate,
    String? timeSlot,
  ) async {
    if (name.isEmpty || email.isEmpty || phone.isEmpty || guests.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    if (!phone.startsWith('+91') || phone.length != 13) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid Indian WhatsApp number')),
      );
      return;
    }

    Navigator.pop(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFF667eea)),
      ),
    );

    try {
      final bookingReference = 'EV${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
      final eventInfo = _getEventTypeInfo(event.eventType);
      
      await ApiService.bookEvent({
        'bookingReference': bookingReference,
        'eventId': event.id,
        'eventName': eventInfo['name'],
        'guestName': name,
        'email': email,
        'phone': phone,
        'eventDate': eventDate.toIso8601String().split('T')[0],
        'eventTime': timeSlot,
        'guests': int.parse(guests),
        'totalPrice': event.price,
        'transactionId': 'PENDING',
        'paymentMethod': 'upi',
      });

      Navigator.pop(context);

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 30),
              SizedBox(width: 10),
              Text('Booking Submitted!'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Booking ID: $bookingReference'),
              const SizedBox(height: 8),
              Text('Event: ${eventInfo['name']}'),
              const SizedBox(height: 8),
              Text('Date: ${eventDate.day}/${eventDate.month}/${eventDate.year}'),
              const SizedBox(height: 8),
              Text('Amount: ₹${event.price}'),
              const SizedBox(height: 16),
              const Text(
                'Please complete payment via UPI to confirm your booking.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Events & Party Bookings',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF667eea), Color(0xFF764ba2)],
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshEvents,
        color: const Color(0xFF667eea),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFFF5F7FA),
                const Color(0xFFC3CFE2).withOpacity(0.5),
              ],
            ),
          ),
          child: FutureBuilder<List<Event>>(
            key: ValueKey(_refreshKey),
            future: ApiService.getEvents(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: CircularProgressIndicator(color: Color(0xFF667eea)),
                );
              }

              if (snapshot.hasError) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 60, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Error: ${snapshot.error}'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _refreshEvents,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                );
              }

              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.event_busy, size: 60, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text('No events available'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _refreshEvents,
                        child: const Text('Refresh'),
                      ),
                    ],
                  ),
                );
              }

              final events = snapshot.data!;

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: events.length,
                itemBuilder: (context, index) {
                  final event = events[index];
                  final eventInfo = _getEventTypeInfo(event.eventType);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 15,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                              child: Image.network(
                                event.image,
                                height: 180,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  height: 180,
                                  color: Colors.grey.shade300,
                                  child: const Icon(Icons.event, size: 60, color: Colors.grey),
                                ),
                              ),
                            ),
                            Positioned(
                              top: 12,
                              right: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [eventInfo['color'], eventInfo['color'].withOpacity(0.8)],
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '${eventInfo['icon']} ₹${event.price}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                eventInfo['name'],
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF2c3e50),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.location_on, size: 16, color: Color(0xFF667eea)),
                                  const SizedBox(width: 4),
                                  Text(
                                    event.location,
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748b)),
                                  ),
                                  if (event.maxGuests != null) ...[
                                    const SizedBox(width: 16),
                                    const Icon(Icons.people, size: 16, color: Color(0xFF667eea)),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${event.maxGuests} Max',
                                      style: const TextStyle(fontSize: 13, color: Color(0xFF64748b)),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: Container(
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: ElevatedButton(
                                    onPressed: () => _showBookingModal(event),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: const Text(
                                      'Book Event',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}
