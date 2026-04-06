import 'dart:convert';
import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService {
  static WebSocketChannel? _channel;
  static bool _isConnected = false;
  static Function(Map<String, dynamic>)? _onMessage;
  
  // Stream controller for broadcasting updates to all listeners
  static final StreamController<Map<String, dynamic>> _updateController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  // Public stream that widgets can listen to
  static Stream<Map<String, dynamic>> get updateStream => _updateController.stream;
  
  static const String wsUrl = 'wss://vshakago.in:3005';
  
  // Connect to WebSocket server
  static void connect({Function(Map<String, dynamic>)? onMessage}) {
    if (_isConnected) {
      print('⚠️ WebSocket already connected, updating message handler');
      _onMessage = onMessage;
      return;
    }
    
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _isConnected = true;
      _onMessage = onMessage;
      
      print('✅ WebSocket connected to $wsUrl');
      
      // Listen for messages
      _channel!.stream.listen(
        (message) {
          try {
            final data = json.decode(message);
            print('📨 WebSocket message received: ${data['type']}');
            print('📊 Full message data: $data');
            
            // Broadcast to stream for all listeners
            _updateController.add(data);
            
            if (_onMessage != null) {
              print('✅ Calling message handler');
              _onMessage!(data);
            } else {
              print('⚠️ No message handler registered');
            }
          } catch (e) {
            print('❌ Error parsing WebSocket message: $e');
            print('📝 Raw message: $message');
          }
        },
        onError: (error) {
          print('❌ WebSocket error: $error');
          _isConnected = false;
          _reconnect();
        },
        onDone: () {
          print('📴 WebSocket disconnected');
          _isConnected = false;
          _reconnect();
        },
      );
      
      // Send ping every 30 seconds to keep connection alive
      _startHeartbeat();
      
    } catch (e) {
      print('❌ WebSocket connection failed: $e');
      _isConnected = false;
      _reconnect();
    }
  }
  
  // Reconnect after 5 seconds
  static void _reconnect() {
    Future.delayed(const Duration(seconds: 5), () {
      if (!_isConnected) {
        print('🔄 Reconnecting WebSocket...');
        connect(onMessage: _onMessage);
      }
    });
  }
  
  // Send ping to keep connection alive
  static void _startHeartbeat() {
    Future.delayed(const Duration(seconds: 30), () {
      if (_isConnected && _channel != null) {
        try {
          _channel!.sink.add(json.encode({'type': 'ping'}));
          _startHeartbeat();
        } catch (e) {
          print('❌ Heartbeat failed: $e');
        }
      }
    });
  }
  
  // Disconnect
  static void disconnect() {
    if (_channel != null) {
      _channel!.sink.close();
      _channel = null;
      _isConnected = false;
      print('📴 WebSocket disconnected manually');
    }
  }
  
  // Check if connected
  static bool get isConnected => _isConnected;
}
