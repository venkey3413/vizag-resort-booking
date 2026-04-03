class Resort {
  final int id;
  final String name;
  final String location;
  final int price;
  final String image;
  final String? description;
  final String? amenities;
  final String? gallery;
  final String? mapLink;

  Resort({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.image,
    this.description,
    this.amenities,
    this.gallery,
    this.mapLink,
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
      gallery: json['gallery'],
      mapLink: json['map_link'],
    );
  }

  // Helper method to get gallery images as list
  List<String> getGalleryImages() {
    if (gallery == null || gallery!.isEmpty) {
      return [image]; // Return main image if no gallery
    }
    return gallery!
        .split(',')
        .map((img) => img.trim())
        .where((img) => img.isNotEmpty)
        .toList();
  }
}
