class Resort {
  final int id;
  final String name;
  final String location;
  final double price;
  final String description;
  final String image;
  final bool available;

  Resort({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.description,
    required this.image,
    required this.available,
  });

  factory Resort.fromJson(Map<String, dynamic> json) {
    return Resort(
      id: json['id'],
      name: json['name'] ?? '',
      location: json['location'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      description: json['description'] ?? '',
      image: json['image'] ?? '',
      available: json['available'] == 1,
    );
  }
}