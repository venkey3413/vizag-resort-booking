import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/owner_dashboard_colors.dart';
import '../services/owner_api_service.dart';

class EditResortScreen extends StatefulWidget {
  final Map<String, dynamic> resort;

  const EditResortScreen({super.key, required this.resort});

  @override
  State<EditResortScreen> createState() => _EditResortScreenState();
}

class _EditResortScreenState extends State<EditResortScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _locationController;
  late TextEditingController _priceController;
  late TextEditingController _descController;
  late TextEditingController _maxGuestsController;
  late TextEditingController _amenitiesController;
  late bool _available;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.resort['name'] ?? '');
    _locationController = TextEditingController(text: widget.resort['location'] ?? '');
    _priceController = TextEditingController(text: widget.resort['price']?.toString() ?? '');
    _descController = TextEditingController(text: widget.resort['description'] ?? '');
    _maxGuestsController = TextEditingController(text: widget.resort['max_guests']?.toString() ?? '');
    _amenitiesController = TextEditingController(text: widget.resort['amenities'] ?? '');
    _available = widget.resort['available'] == 1;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    _priceController.dispose();
    _descController.dispose();
    _maxGuestsController.dispose();
    _amenitiesController.dispose();
    super.dispose();
  }

  Future<void> _saveResort() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final data = {
        'name': _nameController.text,
        'location': _locationController.text,
        'price': int.parse(_priceController.text),
        'description': _descController.text,
        'max_guests': _maxGuestsController.text.isEmpty ? null : int.parse(_maxGuestsController.text),
        'amenities': _amenitiesController.text,
        'available': _available ? 1 : 0,
        'image': widget.resort['image'] ?? '',
        'gallery': widget.resort['gallery'] ?? '',
        'videos': widget.resort['videos'] ?? '',
        'map_link': widget.resort['map_link'] ?? '',
      };

      final success = await OwnerApiService.updateResort(widget.resort['id'], data);

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Resort updated successfully!'),
            backgroundColor: OwnerDashboardColors.green,
          ),
        );
        Navigator.pop(context, true);
      } else {
        throw Exception('Update failed');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update: ${e.toString()}'),
          backgroundColor: OwnerDashboardColors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: OwnerDashboardColors.bg,
      appBar: AppBar(
        title: Text(
          'Edit Resort',
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
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Name
            _buildTextField(
              controller: _nameController,
              label: 'Resort Name',
              hint: 'Enter resort name',
              validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
            ),
            const SizedBox(height: 16),

            // Location
            _buildTextField(
              controller: _locationController,
              label: 'Location',
              hint: 'Enter location',
              validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
            ),
            const SizedBox(height: 16),

            // Price
            _buildTextField(
              controller: _priceController,
              label: 'Base Price (₹/night)',
              hint: '2500',
              keyboardType: TextInputType.number,
              validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
            ),
            const SizedBox(height: 16),

            // Max Guests
            _buildTextField(
              controller: _maxGuestsController,
              label: 'Max Guests',
              hint: '20',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            // Description
            _buildTextField(
              controller: _descController,
              label: 'Description',
              hint: 'Resort description...',
              maxLines: 4,
            ),
            const SizedBox(height: 16),

            // Amenities
            _buildTextField(
              controller: _amenitiesController,
              label: 'Amenities (comma separated)',
              hint: 'Pool, WiFi, AC, Parking...',
            ),
            const SizedBox(height: 16),

            // Availability Toggle
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: OwnerDashboardColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: OwnerDashboardColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Availability',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: OwnerDashboardColors.text,
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        _available ? 'Available' : 'Unavailable',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: _available
                              ? OwnerDashboardColors.green
                              : OwnerDashboardColors.red,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Switch(
                        value: _available,
                        onChanged: (value) {
                          setState(() {
                            _available = value;
                          });
                        },
                        activeColor: OwnerDashboardColors.tealLight,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveResort,
                style: ElevatedButton.styleFrom(
                  backgroundColor: OwnerDashboardColors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        '💾 Save Changes',
                        style: GoogleFonts.dmSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: OwnerDashboardColors.text,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: GoogleFonts.dmSans(fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.dmSans(fontSize: 14, color: OwnerDashboardColors.text2),
            filled: true,
            fillColor: OwnerDashboardColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: OwnerDashboardColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: OwnerDashboardColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: OwnerDashboardColors.blue, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          validator: validator,
        ),
      ],
    );
  }
}
