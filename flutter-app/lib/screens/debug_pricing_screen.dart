import 'package:flutter/material.dart';
import '../models/resort.dart';

class DynamicPricingDebugScreen extends StatelessWidget {
  final Resort resort;

  const DynamicPricingDebugScreen({super.key, required this.resort});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dynamic Pricing Debug'),
        backgroundColor: Colors.orange,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSection('Resort Info', [
              'ID: ${resort.id}',
              'Name: ${resort.name}',
              'Base Price: ₹${resort.price}',
            ]),
            const SizedBox(height: 16),
            _buildSection('Dynamic Pricing Data', [
              'Count: ${resort.dynamicPricing.length}',
              'Is Empty: ${resort.dynamicPricing.isEmpty}',
              '',
              if (resort.dynamicPricing.isEmpty)
                '⚠️ NO DYNAMIC PRICING DATA FOUND!'
              else
                ...resort.dynamicPricing.map((p) => 
                  '${p.dayType}: ₹${p.price}'
                ),
            ]),
            const SizedBox(height: 16),
            _buildSection('Test Calculations', [
              _testCalculation('Monday (Weekday)', 1),
              _testCalculation('Tuesday (Weekday)', 2),
              _testCalculation('Friday (Weekday)', 5),
              _testCalculation('Saturday (Weekend)', 6),
              _testCalculation('Sunday (Weekend)', 7),
            ]),
            const SizedBox(height: 24),
            if (resort.dynamicPricing.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '❌ PROBLEM IDENTIFIED',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.red,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'This resort has NO dynamic pricing data loaded from the API.',
                      style: TextStyle(fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Solutions:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Text('1. Go to admin panel (port 3001)'),
                    const Text('2. Edit this resort'),
                    const Text('3. Set weekday and weekend prices'),
                    const Text('4. Save changes'),
                    const Text('5. Restart the app'),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '✅ DYNAMIC PRICING LOADED',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Dynamic pricing data is present. If prices are still the same, check the console logs when booking.',
                      style: TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<String> items) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
            const Divider(),
            ...items.map((item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(item, style: const TextStyle(fontSize: 14)),
            )),
          ],
        ),
      ),
    );
  }

  String _testCalculation(String label, int weekday) {
    int rate = resort.price;
    String rateType = 'Base';

    if (resort.dynamicPricing.isNotEmpty) {
      if (weekday == 6 || weekday == 7) {
        // Weekend
        final weekendPrice = resort.dynamicPricing.firstWhere(
          (p) => p.dayType == 'weekend',
          orElse: () => DynamicPricing(dayType: '', price: 0),
        );
        if (weekendPrice.price > 0) {
          rate = weekendPrice.price;
          rateType = 'Weekend';
        }
      } else {
        // Weekday
        final weekdayPrice = resort.dynamicPricing.firstWhere(
          (p) => p.dayType == 'weekday',
          orElse: () => DynamicPricing(dayType: '', price: 0),
        );
        if (weekdayPrice.price > 0) {
          rate = weekdayPrice.price;
          rateType = 'Weekday';
        }
      }
    }

    return '$label → ₹$rate ($rateType)';
  }
}
