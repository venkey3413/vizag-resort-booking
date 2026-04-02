class Resort {
  final int id;
  final String name;
  final String location;
  final int price;
  final String image;
  final String? description;
  final String? amenities;

  Resort({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.image,
    this.description,
    this.amenities,
  });

  factory Resort.fromJson(Map<String, dynamic> json) {
    return Resort(
      id: json['id'],
      name: json['name'],
      location: json['location'],
      price: json['price'],
      image: json['image'],
      description: json['description'],
      amenities: json['amenities'],
    );
  }
}
