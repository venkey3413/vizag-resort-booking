class Booking {
  final int id;
  final int resortId;
  final String guestName;
  final String email;
  final String phone;
  final DateTime checkIn;
  final DateTime checkOut;
  final int guests;
  final double basePrice;
  final double platformFee;
  final double totalPrice;
  final String bookingReference;
  final String? transactionId;
  final String paymentStatus;
  final String status;
  final DateTime bookingDate;

  Booking({
    required this.id,
    required this.resortId,
    required this.guestName,
    required this.email,
    required this.phone,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.basePrice,
    required this.platformFee,
    required this.totalPrice,
    required this.bookingReference,
    this.transactionId,
    required this.paymentStatus,
    required this.status,
    required this.bookingDate,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'],
      resortId: json['resort_id'],
      guestName: json['guest_name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      checkIn: DateTime.parse(json['check_in']),
      checkOut: DateTime.parse(json['check_out']),
      guests: json['guests'] ?? 1,
      basePrice: (json['base_price'] ?? 0).toDouble(),
      platformFee: (json['platform_fee'] ?? 0).toDouble(),
      totalPrice: (json['total_price'] ?? 0).toDouble(),
      bookingReference: json['booking_reference'] ?? '',
      transactionId: json['transaction_id'],
      paymentStatus: json['payment_status'] ?? 'pending',
      status: json['status'] ?? 'pending',
      bookingDate: DateTime.parse(json['booking_date']),
    );
  }
}