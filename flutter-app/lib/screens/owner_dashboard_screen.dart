import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/owner_dashboard_colors.dart';
import '../models/owner.dart';
import '../services/owner_api_service.dart';
import 'edit_resort_screen.dart';
import 'package:intl/intl.dart';

class OwnerDashboardScreen extends StatefulWidget {
  final Owner owner;
  final OwnerStats stats;
  final List<Map<String, dynamic>> resorts;
  final List<Booking> bookings;

  const OwnerDashboardScreen({
    super.key,
    required this.owner,
    required this.stats,
    required this.resorts,
    required this.bookings,
  });

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  int _selectedIndex = 0;
  late List<Booking> _bookings;
  late OwnerStats _stats;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _bookings = widget.bookings;
    _stats = widget.stats;
  }

  Future<void> _refreshData() async {
    if (_isRefreshing) return;
    
    setState(() {
      _isRefreshing = true;
    });

    try {
      // Fetch all bookings
      final allBookings = await OwnerApiService.getBookings();
      
      // Filter for owner's resorts
      final ownerResortIds = widget.resorts.map((r) => r['id']).toList();
      final filteredBookings = allBookings
          .where((b) => ownerResortIds.contains(b['resort_id']))
          .map((b) => Booking.fromJson(b))
          .toList();

      // Update stats
      final newStats = OwnerStats(
        totalBookings: filteredBookings.length,
        pendingBookings: filteredBookings.where((b) => b.paymentStatus == 'pending').length,
        confirmedBookings: filteredBookings.where((b) => b.paymentStatus == 'paid').length,
      );

      setState(() {
        _bookings = filteredBookings;
        _stats = newStats;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Data refreshed successfully'),
          backgroundColor: OwnerDashboardColors.green,
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to refresh: ${e.toString()}'),
          backgroundColor: OwnerDashboardColors.red,
          duration: const Duration(seconds: 3),
        ),
      );
    } finally {
      setState(() {
        _isRefreshing = false;
      });
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: OwnerDashboardColors.bg,
      appBar: AppBar(
        title: Text(
          _getPageTitle(),
          style: GoogleFonts.dmSans(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: OwnerDashboardColors.headerGradient,
          ),
        ),
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              backgroundColor: Colors.white.withOpacity(0.2),
              child: Text(
                widget.owner.name[0].toUpperCase(),
                style: GoogleFonts.dmSans(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: _getSelectedPage(),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  String _getPageTitle() {
    switch (_selectedIndex) {
      case 0:
        return 'Overview';
      case 1:
        return 'Scan QR Ticket';
      case 2:
        return 'Bookings';
      case 3:
        return 'My Resorts';
      default:
        return 'Dashboard';
    }
  }

  Widget _getSelectedPage() {
    switch (_selectedIndex) {
      case 0:
        return _buildOverviewPage();
      case 1:
        return _buildQRScannerPage();
      case 2:
        return _buildBookingsPage();
      case 3:
        return _buildResortsPage();
      default:
        return _buildOverviewPage();
    }
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: OwnerDashboardColors.surface,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: OwnerDashboardColors.sidebarGradient,
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CircleAvatar(
                    radius: 32,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.person, size: 32,
                        color: OwnerDashboardColors.blue),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.owner.name,
                    style: GoogleFonts.dmSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.resorts.isNotEmpty
                        ? widget.resorts.map((r) => r['name']).join(', ')
                        : 'No resorts assigned',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _buildDrawerItem(Icons.dashboard_outlined, 'Overview', 0),
                _buildDrawerItem(Icons.qr_code_scanner, 'Scan QR Ticket', 1),
                _buildDrawerItem(Icons.book_outlined, 'Bookings', 2),
                _buildDrawerItem(Icons.hotel_outlined, 'My Resorts', 3),
                const Divider(color: OwnerDashboardColors.border),
                ListTile(
                  leading: const Icon(Icons.logout,
                      color: OwnerDashboardColors.red),
                  title: Text(
                    'Logout',
                    style: GoogleFonts.dmSans(
                      color: OwnerDashboardColors.red,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onTap: () {
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(IconData icon, String title, int index) {
    final isSelected = _selectedIndex == index;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected
            ? OwnerDashboardColors.blueBg
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: isSelected
            ? Border(
                left: BorderSide(
                  color: OwnerDashboardColors.tealLight,
                  width: 3,
                ),
              )
            : null,
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected
              ? OwnerDashboardColors.tealLight
              : OwnerDashboardColors.text2,
        ),
        title: Text(
          title,
          style: GoogleFonts.dmSans(
            color: isSelected
                ? OwnerDashboardColors.text
                : OwnerDashboardColors.text2,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
        onTap: () {
          _onItemTapped(index);
          Navigator.pop(context);
        },
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: OwnerDashboardColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed,
        backgroundColor: OwnerDashboardColors.surface,
        selectedItemColor: OwnerDashboardColors.tealLight,
        unselectedItemColor: OwnerDashboardColors.text2,
        selectedLabelStyle: GoogleFonts.dmSans(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Overview',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner_outlined),
            activeIcon: Icon(Icons.qr_code_scanner),
            label: 'Scan QR',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.book_outlined),
            activeIcon: Icon(Icons.book),
            label: 'Bookings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.hotel_outlined),
            activeIcon: Icon(Icons.hotel),
            label: 'Resorts',
          ),
        ],
      ),
    );
  }

  // Overview Page
  Widget _buildOverviewPage() {
    final confirmedBookings = _bookings.where((b) => b.paymentStatus == 'paid').length;
    final pendingBookings = _bookings.where((b) => b.paymentStatus == 'pending').length;
    final revenue = _bookings
        .where((b) => b.paymentStatus == 'paid')
        .fold<int>(0, (sum, b) => sum + b.totalPrice);

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _buildStatCard(
                '📋',
                _bookings.length.toString(),
                'Total Bookings',
                OwnerDashboardColors.blue,
              ),
              _buildStatCard(
                '✅',
                confirmedBookings.toString(),
                'Confirmed',
                OwnerDashboardColors.tealLight,
              ),
              _buildStatCard(
                '⏳',
                pendingBookings.toString(),
                'Pending',
                OwnerDashboardColors.gold,
              ),
              _buildStatCard(
                '💰',
                '₹${_formatNumber(revenue)}',
                'Revenue',
                OwnerDashboardColors.green,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Bookings
          _buildSectionHeader('Recent Bookings'),
          const SizedBox(height: 12),
          ..._bookings.take(5).map((booking) => _buildBookingCard(booking)),
        ],
      ),
    );
  }

  // QR Scanner Page
  Widget _buildQRScannerPage() {
    return QRScannerWidget(
      ownerId: widget.owner.id,
      onScanSuccess: _refreshData,
    );
  }

  // Bookings Page
  Widget _buildBookingsPage() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionHeader('All Bookings (${_bookings.length})'),
          const SizedBox(height: 12),
          ..._bookings.map((booking) => _buildBookingCard(booking)),
        ],
      ),
    );
  }

  // Resorts Page
  Widget _buildResortsPage() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionHeader('My Resorts (${widget.resorts.length})'),
        const SizedBox(height: 12),
        ...widget.resorts.map((resort) => _buildResortCard(resort)),
      ],
    );
  }

  Widget _buildStatCard(String emoji, String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: OwnerDashboardColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: OwnerDashboardColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            emoji,
            style: const TextStyle(fontSize: 24),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.dmMono(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: GoogleFonts.dmSans(
                  fontSize: 11,
                  color: OwnerDashboardColors.text2,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: OwnerDashboardColors.text,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildBookingCard(Booking booking) {
    final isPaid = booking.paymentStatus == 'paid';
    final isPending = booking.paymentStatus == 'pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: OwnerDashboardColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: OwnerDashboardColors.border),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: OwnerDashboardColors.border),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  booking.bookingReference,
                  style: GoogleFonts.dmMono(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: OwnerDashboardColors.accent,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isPaid
                        ? OwnerDashboardColors.greenBg
                        : isPending
                            ? OwnerDashboardColors.amberBg
                            : OwnerDashboardColors.redBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isPaid
                        ? 'CONFIRMED'
                        : isPending
                            ? 'PENDING'
                            : 'CANCELLED',
                    style: GoogleFonts.dmMono(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: isPaid
                          ? OwnerDashboardColors.green
                          : isPending
                              ? OwnerDashboardColors.amber
                              : OwnerDashboardColors.red,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Details
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _buildBookingRow('Guest', booking.guestName),
                _buildBookingRow('Resort', booking.resortName ?? 'N/A'),
                _buildBookingRow('Check-in',
                    DateFormat('dd MMM yyyy').format(DateTime.parse(booking.checkIn))),
                _buildBookingRow('Guests', booking.guests.toString()),
                _buildBookingRow('Amount', '₹${_formatNumber(booking.totalPrice)}'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.dmSans(
              fontSize: 13,
              color: OwnerDashboardColors.text2,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.dmSans(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: OwnerDashboardColors.text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResortCard(Map<String, dynamic> resort) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: OwnerDashboardColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: OwnerDashboardColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    resort['name'] ?? '',
                    style: GoogleFonts.dmSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: OwnerDashboardColors.text,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: resort['available'] == 1
                        ? OwnerDashboardColors.greenBg
                        : OwnerDashboardColors.redBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    resort['available'] == 1 ? '🟢 Available' : '🔴 Closed',
                    style: GoogleFonts.dmSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: resort['available'] == 1
                          ? OwnerDashboardColors.green
                          : OwnerDashboardColors.red,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '📍 ${resort['location'] ?? ''}',
              style: GoogleFonts.dmSans(
                fontSize: 13,
                color: OwnerDashboardColors.text2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '₹${_formatNumber(resort['price'] ?? 0)}/night',
              style: GoogleFonts.dmSans(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: OwnerDashboardColors.accent,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _editResort(resort),
                icon: const Icon(Icons.edit, size: 18),
                label: Text(
                  'Edit Resort',
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: OwnerDashboardColors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _editResort(Map<String, dynamic> resort) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditResortScreen(resort: resort),
      ),
    );

    if (result == true) {
      _refreshData();
    }
  }

  String _formatNumber(int number) {
    return NumberFormat('#,##,###', 'en_IN').format(number);
  }
}

// QR Scanner Widget
class QRScannerWidget extends StatefulWidget {
  final int ownerId;
  final VoidCallback onScanSuccess;

  const QRScannerWidget({
    super.key,
    required this.ownerId,
    required this.onScanSuccess,
  });

  @override
  State<QRScannerWidget> createState() => _QRScannerWidgetState();
}

class _QRScannerWidgetState extends State<QRScannerWidget> {
  MobileScannerController cameraController = MobileScannerController();
  bool _isScanning = false;
  String? _scanResult;
  bool? _isValid;

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  Future<void> _verifyTicket(String bookingRef) async {
    if (_isScanning) return;

    setState(() {
      _isScanning = true;
      _scanResult = null;
    });

    try {
      final data = await OwnerApiService.verifyTicket(bookingRef, widget.ownerId);

      setState(() {
        _isValid = data['valid'] == true;
        _scanResult = data['valid'] == true
            ? 'Entry Allowed\n\nGuest: ${data['guest']}\nResort: ${data['resort']}'
            : 'Entry Denied\n\n${data['message']}';
      });

      if (data['valid'] == true) {
        widget.onScanSuccess();
      }
    } catch (e) {
      setState(() {
        _isValid = false;
        _scanResult = 'Verification failed\n\nPlease try again';
      });
    } finally {
      setState(() {
        _isScanning = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: _scanResult == null
              ? MobileScanner(
                  controller: cameraController,
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    for (final barcode in barcodes) {
                      if (barcode.rawValue != null) {
                        _verifyTicket(barcode.rawValue!);
                        break;
                      }
                    }
                  },
                )
              : Container(
                  color: OwnerDashboardColors.bg,
                  child: Center(
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: _isValid == true
                            ? OwnerDashboardColors.greenBg
                            : OwnerDashboardColors.redBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _isValid == true
                              ? OwnerDashboardColors.green
                              : OwnerDashboardColors.red,
                          width: 2,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isValid == true ? Icons.check_circle : Icons.cancel,
                            size: 64,
                            color: _isValid == true
                                ? OwnerDashboardColors.green
                                : OwnerDashboardColors.red,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _scanResult!,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.dmSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: _isValid == true
                                  ? OwnerDashboardColors.green
                                  : OwnerDashboardColors.red,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                _scanResult = null;
                                _isValid = null;
                              });
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: OwnerDashboardColors.blue,
                            ),
                            child: Text(
                              'Scan Another',
                              style: GoogleFonts.dmSans(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
        ),
        if (_scanResult == null)
          Container(
            padding: const EdgeInsets.all(24),
            color: OwnerDashboardColors.surface,
            child: Column(
              children: [
                Text(
                  'Point camera at QR code',
                  style: GoogleFonts.dmSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: OwnerDashboardColors.text,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Scan the customer\'s booking QR code to verify entry',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    color: OwnerDashboardColors.text2,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
