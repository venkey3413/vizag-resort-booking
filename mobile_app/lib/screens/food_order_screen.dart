import 'package:flutter/material.dart';
import '../services/api_service.dart';

class FoodOrderScreen extends StatefulWidget {
  const FoodOrderScreen({super.key});

  @override
  State<FoodOrderScreen> createState() => _FoodOrderScreenState();
}

class _FoodOrderScreenState extends State<FoodOrderScreen> {
  List<dynamic> foodItems = [];
  Map<int, int> cart = {};
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFoodItems();
  }

  Future<void> _loadFoodItems() async {
    try {
      final items = await ApiService.getFoodItems();
      setState(() {
        foodItems = items;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading food items: $e')),
      );
    }
  }

  double get totalAmount {
    double total = 0;
    cart.forEach((itemId, quantity) {
      final item = foodItems.firstWhere((item) => item['id'] == itemId);
      total += (item['price'] ?? 0) * quantity;
    });
    return total;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Food Order'),
        backgroundColor: const Color(0xFF28a745),
        foregroundColor: Colors.white,
        actions: [
          if (cart.isNotEmpty)
            IconButton(
              icon: Badge(
                label: Text('${cart.values.fold(0, (sum, qty) => sum + qty)}'),
                child: const Icon(Icons.shopping_cart),
              ),
              onPressed: _showCart,
            ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: foodItems.length,
              itemBuilder: (context, index) {
                final item = foodItems[index];
                final itemId = item['id'];
                final quantity = cart[itemId] ?? 0;
                
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item['name'] ?? 'Food Item',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              Text(item['description'] ?? ''),
                              const SizedBox(height: 8),
                              Text(
                                '₹${item['price']}',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF28a745)),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          children: [
                            if (quantity > 0) ...[
                              Row(
                                children: [
                                  IconButton(
                                    onPressed: () => setState(() {
                                      if (cart[itemId]! > 1) {
                                        cart[itemId] = cart[itemId]! - 1;
                                      } else {
                                        cart.remove(itemId);
                                      }
                                    }),
                                    icon: const Icon(Icons.remove),
                                  ),
                                  Text('$quantity'),
                                  IconButton(
                                    onPressed: () => setState(() => cart[itemId] = quantity + 1),
                                    icon: const Icon(Icons.add),
                                  ),
                                ],
                              ),
                            ] else
                              ElevatedButton(
                                onPressed: () => setState(() => cart[itemId] = 1),
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF28a745)),
                                child: const Text('Add', style: TextStyle(color: Colors.white)),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  void _showCart() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Your Order', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...cart.entries.map((entry) {
              final item = foodItems.firstWhere((item) => item['id'] == entry.key);
              return ListTile(
                title: Text(item['name']),
                subtitle: Text('₹${item['price']} x ${entry.value}'),
                trailing: Text('₹${(item['price'] * entry.value).toStringAsFixed(0)}'),
              );
            }).toList(),
            const Divider(),
            ListTile(
              title: const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
              trailing: Text('₹${totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _placeOrder,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF28a745)),
                child: const Text('Place Order', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _placeOrder() {
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Order placed successfully!')),
    );
    setState(() => cart.clear());
  }
}