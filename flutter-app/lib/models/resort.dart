class DynamicPricing {
  final String dayType;
  final int price;

  DynamicPricing({required this.dayType, required this.price});

  factory DynamicPricing.fromJson(Map<String, dynamic> json) {
    return DynamicPricing(
      dayType: json['day_type'],
      price: json['price'],
    );
  }
}

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
  final List<DynamicPricing> dynamicPricing;

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
    this.dynamicPricing = const [],
  });

  factory Resort.fromJson(Map<String, dynamic> json) {
    print('\n🏨 Parsing resort: ${json['name']}');
    print('   Base price: ₹${json['price']}');
    print('   Raw dynamic_pricing: ${json['dynamic_pricing']}');
    
    List<DynamicPricing> pricing = [];
    if (json['dynamic_pricing'] != null && json['dynamic_pricing'] is List) {
      pricing = (json['dynamic_pricing'] as List)
          .map((p) => DynamicPricing.fromJson(p))
          .toList();
      print('   ✅ Loaded ${pricing.length} dynamic pricing entries');
      for (var p in pricing) {
        print('      - ${p.dayType}: ₹${p.price}');
      }
    } else {
      print('   ⚠️ No dynamic pricing data (${json['dynamic_pricing'] == null ? "null" : "not a list"})');
    }

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
      dynamicPricing: pricing,
    );
  }

  // Get price for specific day
  int getPriceForDate(DateTime date) {
    if (dynamicPricing.isEmpty) {
      return price; // Use base price if no dynamic pricing
    }

    final dayOfWeek = date.weekday; // 1=Monday, 7=Sunday

    // Check for Friday pricing (5)
    if (dayOfWeek == 5) {
      final fridayPrice = dynamicPricing.firstWhere(
        (p) => p.dayType == 'friday',
        orElse: () => DynamicPricing(dayType: '', price: 0),
      );
      if (fridayPrice.price > 0) return fridayPrice.price;
    }

    // Check for weekend pricing (Saturday=6, Sunday=7)
    if (dayOfWeek == 6 || dayOfWeek == 7) {
      final weekendPrice = dynamicPricing.firstWhere(
        (p) => p.dayType == 'weekend',
        orElse: () => DynamicPricing(dayType: '', price: 0),
      );
      if (weekendPrice.price > 0) return weekendPrice.price;
    }

    // Check for weekday pricing (Monday-Thursday)
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      final weekdayPrice = dynamicPricing.firstWhere(
        (p) => p.dayType == 'weekday',
        orElse: () => DynamicPricing(dayType: '', price: 0),
      );
      if (weekdayPrice.price > 0) return weekdayPrice.price;
    }

    return price; // Fallback to base price
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
