class Event {
  final int id;
  final String name;
  final String eventType;
  final String location;
  final int price;
  final String image;
  final String? amenities;
  final String? slotTimings;
  final int? maxGuests;

  Event({
    required this.id,
    required this.name,
    required this.eventType,
    required this.location,
    required this.price,
    required this.image,
    this.amenities,
    this.slotTimings,
    this.maxGuests,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      eventType: json['event_type'] ?? '',
      location: json['location'] ?? '',
      price: json['price'] ?? 0,
      image: json['image'] ?? '',
      amenities: json['amenities'],
      slotTimings: json['slot_timings'],
      maxGuests: json['max_guests'],
    );
  }
}
