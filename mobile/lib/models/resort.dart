class Resort {
  final int id;
  final String name;
  final String location;
  final double price;
  final String description;
  final String image;
  final List<String> gallery;
  final List<String> videos;
  final String mapLink;
  final bool available;

  Resort({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.description,
    required this.image,
    required this.gallery,
    required this.videos,
    required this.mapLink,
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
      gallery: (json['gallery'] ?? '').split('\n').where((s) => s.isNotEmpty).toList(),
      videos: (json['videos'] ?? '').split('\n').where((s) => s.isNotEmpty).toList(),
      mapLink: json['map_link'] ?? '',
      available: json['available'] == 1,
    );
  }
}