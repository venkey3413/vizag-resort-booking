class Resort {
  final int id;
  final String name;
  final String location;
  final int price;
  final String image;
  final String? description;
  final String? amenities;
  final String? gallery;
  final String? videos;
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
    this.videos,
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
      videos: json['videos'],
      mapLink: json['map_link'],
    );
  }

  // Helper method to get gallery images as list
  List<String> getGalleryImages() {
    if (gallery == null || gallery!.isEmpty) {
      return [image]; // Return main image if no gallery
    }
    // Split by newline or comma
    return gallery!
        .split(RegExp(r'[\n,]'))
        .map((img) => img.trim())
        .where((img) => img.isNotEmpty)
        .toList();
  }

  // Helper method to get video URLs as list
  List<String> getVideoUrls() {
    if (videos == null || videos!.isEmpty) {
      return [];
    }
    return videos!
        .split(RegExp(r'[\n,]'))
        .map((url) => url.trim())
        .where((url) => url.isNotEmpty)
        .toList();
  }

  // Helper method to extract YouTube video ID from URL
  String? getYouTubeVideoId(String url) {
    final regExp = RegExp(
      r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(url);
    return match?.group(1);
  }
}
