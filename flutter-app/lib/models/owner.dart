class Owner {
  final int id;
  final String name;
  final String? email;
  final String? phone;
  final List<int> resortIds;

  Owner({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.resortIds,
  });

  factory Owner.fromJson(Map<String, dynamic> json) {
    List<int> resortIds = [];
    if (json['resort_ids'] != null && json['resort_ids'].toString().isNotEmpty) {
      resortIds = json['resort_ids']
          .toString()
          .split(',')
          .where((id) => id.trim().isNotEmpty)
          .map((id) => int.parse(id.trim()))
          .toList();
    }

    return Owner(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'],
      phone: json['phone'],
      resortIds: resortIds,
    );
  }
}

class OwnerStats {
  final int totalBookings;
  final int pendingBookings;
  final int confirmedBookings;

  OwnerStats({
    required this.totalBookings,
    required this.pendingBookings,
    required this.confirmedBookings,
  });

  factory OwnerStats.fromJson(Map<String, dynamic> json) {
    return OwnerStats(
      totalBookings: json['totalBookings'] ?? 0,
      pendingBookings: json['pendingBookings'] ?? 0,
      confirmedBookings: json['confirmedBookings'] ?? 0,
    );
  }
}

class Booking {
  final int id;
  final String bookingReference;
  final String guestName;
  final String email;
  final String phone;
  final String checkIn;
  final String checkOut;
  final int guests;
  final int totalPrice;
  final String paymentStatus;
  final String? resortName;
  final int? resortId;
  final String? transactionId;
  final int? checkedIn;

  Booking({
    required this.id,
    required this.bookingReference,
    required this.guestName,
    required this.email,
    required this.phone,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.totalPrice,
    required this.paymentStatus,
    this.resortName,
    this.resortId,
    this.transactionId,
    this.checkedIn,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] ?? 0,
      bookingReference: json['booking_reference'] ?? '',
      guestName: json['guest_name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      checkIn: json['check_in'] ?? '',
      checkOut: json['check_out'] ?? '',
      guests: json['guests'] ?? 0,
      totalPrice: json['total_price'] ?? 0,
      paymentStatus: json['payment_status'] ?? 'pending',
      resortName: json['resort_name'],
      resortId: json['resort_id'],
      transactionId: json['transaction_id'],
      checkedIn: json['checked_in'],
    );
  }
}
