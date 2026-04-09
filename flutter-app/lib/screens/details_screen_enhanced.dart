import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import '../models/resort.dart';
import 'booking_modal_screen.dart';

class DetailsScreenEnhanced extends StatefulWidget {
  final Resort resort;

  const DetailsScreenEnhanced({super.key, required this.resort});

  @override
  State<DetailsScreenEnhanced> createState() => _DetailsScreenEnhancedState();
}

class _DetailsScreenEnhancedState extends State<DetailsScreenEnhanced> {
  int _currentImageIndex = 0;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Widget _buildDynamicPricingInfo() {
    final weekday = widget.resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekday',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );
    final weekend = widget.resort.dynamicPricing.firstWhere(
      (p) => p.dayType == 'weekend',
      orElse: () => DynamicPricing(dayType: '', price: 0),
    );

    return Column(
      children: [
        if (weekday.price > 0)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Weekday (Mon-Fri):',
                  style: TextStyle(fontSize: 14, color: Colors.white70)),
              Text('₹${weekday.price}',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white)),
            ],
          ),
        if (weekday.price > 0 && weekend.price > 0) const SizedBox(height: 4),
        if (weekend.price > 0)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Weekend (Sat-Sun):',
                  style: TextStyle(fontSize: 14, color: Colors.white70)),
              Text('₹${weekend.price}',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white)),
            ],
          ),
      ],
    );
  }

  Future<void> _openMap() async {
    if (widget.resort.mapLink == null || widget.resort.mapLink!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Map location not available')),
      );
      return;
    }

    final Uri uri = Uri.parse(widget.resort.mapLink!);

    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw 'Could not launch map';
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open map: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final galleryImages = widget.resort.getGalleryImages();
    final videoUrls = widget.resort.getVideoUrls();
    final hasGallery = galleryImages.length > 1 || videoUrls.isNotEmpty;
    final totalMediaCount = galleryImages.length + videoUrls.length;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar with Image Gallery
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: Colors.blue[700],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Image Gallery Slider
                  if (hasGallery)
                    SizedBox(
                      height: 300,
                      child: PageView(
                        controller: _pageController,
                        onPageChanged: (index) {
                          setState(() {
                            _currentImageIndex = index;
                          });
                        },
                        children: [
                          // Gallery Images
                          ...galleryImages.map((img) {
                            final imageUrl = img.startsWith('http') ? img : "https://vshakago.in$img";
                            return GestureDetector(
                              onTap: () {
                                print('Image tapped - do nothing');
                              },
                              child: Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              cacheWidth: 800,
                              cacheHeight: 600,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Container(
                                  color: Colors.grey[300],
                                  child: const Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: Colors.grey[300],
                                  child: const Icon(Icons.image_not_supported, size: 80),
                                );
                              },
                            ),
                            );
                          }),
                          // Video Thumbnails
                          ...videoUrls.map((videoUrl) {
                            return VideoThumbnailWidget(
                              videoUrl: videoUrl,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => VideoPlayerScreen(
                                      videoUrl: videoUrl,
                                      resortName: widget.resort.name,
                                    ),
                                  ),
                                );
                              },
                            );
                          }),
                        ],
                      ),
                    )
                  else
                    Image.network(
                      widget.resort.image.startsWith('http') 
                          ? widget.resort.image
                          : "https://vshakago.in${widget.resort.image}",
                      fit: BoxFit.cover,
                      cacheWidth: 800,
                      cacheHeight: 600,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          color: Colors.grey[300],
                          child: const Center(
                            child: CircularProgressIndicator(),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: Colors.grey[300],
                          child: const Icon(Icons.image_not_supported, size: 80),
                        );
                      },
                    ),

                  // Gradient Overlay (ignore pointer so it doesn't block video taps)
                  IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Navigation Buttons - positioned on sides only
                  // Left Arrow Button
                  if (hasGallery && totalMediaCount > 1)
                    Positioned(
                      left: 8,
                      top: 120,
                      bottom: 120,
                      width: 48,
                      child: Center(
                        child: GestureDetector(
                          onTap: () {
                            if (_currentImageIndex > 0) {
                              _pageController.animateToPage(
                                _currentImageIndex - 1,
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            }
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.5),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.arrow_back_ios_new,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ),
                  
                  // Right Arrow Button
                  if (hasGallery && totalMediaCount > 1)
                    Positioned(
                      right: 8,
                      top: 120,
                      bottom: 120,
                      width: 48,
                      child: Center(
                        child: GestureDetector(
                          onTap: () {
                            if (_currentImageIndex < totalMediaCount - 1) {
                              _pageController.animateToPage(
                                _currentImageIndex + 1,
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            }
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.5),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.arrow_forward_ios,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Image Counter
                  if (hasGallery && totalMediaCount > 1)
                    Positioned(
                      bottom: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_currentImageIndex + 1}/$totalMediaCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Resort Name with Wooden Background
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          Color(0xFF8B4513),
                          Color(0xFFA0522D),
                          Color(0xFFCD853F),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Text(
                      widget.resort.name,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        shadows: [
                          Shadow(
                            color: Colors.black54,
                            offset: Offset(2, 2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Location
                  Row(
                    children: [
                      Icon(Icons.location_on, color: Colors.red[400], size: 20),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          widget.resort.location,
                          style: const TextStyle(
                            fontSize: 16,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Price Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.blue[700]!, Colors.blue[500]!],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.blue.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.resort.dynamicPricing.isNotEmpty
                                        ? 'Starting from'
                                        : 'Price per night',
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Best price guaranteed',
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Flexible(
                              child: Text(
                                '₹${widget.resort.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        if (widget.resort.dynamicPricing.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          const Divider(color: Colors.white30),
                          const SizedBox(height: 8),
                          _buildDynamicPricingInfo(),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      // Map Button
                      if (widget.resort.mapLink != null &&
                          widget.resort.mapLink!.isNotEmpty)
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _openMap,
                            icon: const Icon(Icons.location_on),
                            label: const Text('View on Map'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              side: BorderSide(color: Colors.blue[700]!),
                              foregroundColor: Colors.blue[700],
                            ),
                          ),
                        ),
                      if (widget.resort.mapLink != null &&
                          widget.resort.mapLink!.isNotEmpty)
                        const SizedBox(width: 12),

                      // Share Button
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            // TODO: Implement share functionality
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Share feature coming soon')),
                            );
                          },
                          icon: const Icon(Icons.share),
                          label: const Text('Share'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            side: BorderSide(color: Colors.blue[700]!),
                            foregroundColor: Colors.blue[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Description
                  if (widget.resort.description != null &&
                      widget.resort.description!.isNotEmpty) ...[
                    const Text(
                      'About',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Text(
                        widget.resort.description!,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.6,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Amenities with Premium Chips
                  if (widget.resort.amenities != null &&
                      widget.resort.amenities!.isNotEmpty) ...[
                    const Text(
                      'Amenities',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A74DA).withOpacity(0.05),
                        border: Border.all(
                          color: const Color(0xFF0A74DA).withOpacity(0.12),
                        ),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: widget.resort.amenities!
                            .split(',')
                            .map((amenity) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.9),
                              border: Border.all(
                                color: const Color(0xFF0F172A).withOpacity(0.12),
                              ),
                              borderRadius: BorderRadius.circular(999),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.06),
                                  blurRadius: 22,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF6F00).withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    _getAmenityIcon(amenity.trim()),
                                    size: 12,
                                    color: const Color(0xFFFF6F00),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  amenity.trim(),
                                  style: const TextStyle(
                                    color: Color(0xFF0F172A),
                                    fontWeight: FontWeight.w900,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Gallery Preview (if multiple images)
                  if (hasGallery) ...[
                    const Text(
                      'Gallery',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 100,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: galleryImages.length,
                        itemBuilder: (context, index) {
                          return Container(
                            margin: const EdgeInsets.only(right: 8),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                galleryImages[index].startsWith('http') 
                                    ? galleryImages[index]
                                    : "https://vshakago.in${galleryImages[index]}",
                                width: 100,
                                height: 100,
                                fit: BoxFit.cover,
                                cacheWidth: 200,
                                cacheHeight: 200,
                                loadingBuilder: (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return Container(
                                    width: 100,
                                    height: 100,
                                    color: Colors.grey[300],
                                    child: const Center(
                                      child: SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                    ),
                                  );
                                },
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    width: 100,
                                    height: 100,
                                    color: Colors.grey[300],
                                    child: const Icon(Icons.image),
                                  );
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Book Now Button with Orange Gradient
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFF6F00), Color(0xFFFF9A3C)],
                        ),
                        borderRadius: BorderRadius.circular(25),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFF6F00).withOpacity(0.3),
                            blurRadius: 40,
                            offset: const Offset(0, 18),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(25),
                          ),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  BookingModalScreen(resort: widget.resort),
                              fullscreenDialog: true,
                            ),
                          );
                        },
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.calendar_today, size: 20),
                            SizedBox(width: 12),
                            Text(
                              'Book Now',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getAmenityIcon(String amenity) {
    final lower = amenity.toLowerCase();
    if (lower.contains('wifi') || lower.contains('internet')) {
      return Icons.wifi;
    } else if (lower.contains('pool') || lower.contains('swimming')) {
      return Icons.pool;
    } else if (lower.contains('parking')) {
      return Icons.local_parking;
    } else if (lower.contains('restaurant') || lower.contains('food')) {
      return Icons.restaurant;
    } else if (lower.contains('gym') || lower.contains('fitness')) {
      return Icons.fitness_center;
    } else if (lower.contains('spa')) {
      return Icons.spa;
    } else if (lower.contains('ac') || lower.contains('air')) {
      return Icons.ac_unit;
    } else if (lower.contains('tv')) {
      return Icons.tv;
    } else if (lower.contains('beach')) {
      return Icons.beach_access;
    } else {
      return Icons.check_circle;
    }
  }
}

// Video Thumbnail Widget that loads actual video thumbnail
class VideoThumbnailWidget extends StatefulWidget {
  final String videoUrl;
  final VoidCallback onTap;

  const VideoThumbnailWidget({
    super.key,
    required this.videoUrl,
    required this.onTap,
  });

  @override
  State<VideoThumbnailWidget> createState() => _VideoThumbnailWidgetState();
}

class _VideoThumbnailWidgetState extends State<VideoThumbnailWidget> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _loadThumbnail();
  }

  Future<void> _loadThumbnail() async {
    try {
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
      await _controller!.initialize();
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }
    } catch (e) {
      print('Error loading video thumbnail: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (_isInitialized && _controller != null)
            VideoPlayer(_controller!)
          else
            Container(
              color: Colors.black,
              child: const Center(
                child: CircularProgressIndicator(
                  color: Colors.white54,
                  strokeWidth: 2,
                ),
              ),
            ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withOpacity(0.3),
                  Colors.black.withOpacity(0.5),
                ],
              ),
            ),
            child: const Center(
              child: Icon(
                Icons.play_circle_filled,
                size: 80,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Video Player Screen for MP4 videos
class VideoPlayerScreen extends StatefulWidget {
  final String videoUrl;
  final String resortName;

  const VideoPlayerScreen({
    super.key,
    required this.videoUrl,
    required this.resortName,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      print('🎥 Initializing video player with URL: ${widget.videoUrl}');
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
      print('🎥 Controller created, starting initialization...');
      await _controller.initialize();
      print('🎥 Video initialized successfully');
      print('🎥 Video duration: ${_controller.value.duration}');
      print('🎥 Video size: ${_controller.value.size}');
      setState(() {
        _isInitialized = true;
      });
      _controller.play();
      print('🎥 Video playback started');
    } catch (e) {
      print('❌ Video initialization error: $e');
      setState(() {
        _hasError = true;
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(
          widget.resortName,
          style: const TextStyle(color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: _hasError
            ? const Text(
                'Error loading video',
                style: TextStyle(color: Colors.white),
              )
            : !_isInitialized
                ? const CircularProgressIndicator(color: Colors.white)
                : AspectRatio(
                    aspectRatio: _controller.value.aspectRatio,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        VideoPlayer(_controller),
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _controller.value.isPlaying
                                  ? _controller.pause()
                                  : _controller.play();
                            });
                          },
                          child: Container(
                            color: Colors.transparent,
                            child: Center(
                              child: AnimatedOpacity(
                                opacity: _controller.value.isPlaying ? 0.0 : 1.0,
                                duration: const Duration(milliseconds: 300),
                                child: const Icon(
                                  Icons.play_circle_outline,
                                  size: 80,
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
    );
  }
}
