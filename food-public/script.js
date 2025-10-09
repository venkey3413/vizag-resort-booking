let cart = [];
let menuItems = [];

document.addEventListener('DOMContentLoaded', function() {
    loadMenu();
    updateCart();
    // Delay EventBridge setup to ensure page is fully loaded
    setTimeout(setupMenuSync, 1000);
});

function setupMenuSync() {
    console.log('📡 EventBridge real-time sync enabled for food service');
    
    let eventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    function connectEventSource() {
        try {
            eventSource = new EventSource('/api/events');
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Food EventBridge event received:', data);
                    
                    if (data.type === 'food.item.created' || data.type === 'food.item.updated' || data.type === 'food.item.deleted') {
                        console.log('🍽️ Menu update received - refreshing menu');
                        loadMenu();
                    }
                    
                    if (data.type === 'food.order.created' || data.type === 'food.order.updated') {
                        console.log('📋 Food order update received');
                    }
                } catch (error) {
                    // Ignore ping messages
                }
            };
            
            eventSource.onerror = function(error) {
                console.log('⚠️ Food EventBridge connection error, attempting reconnect...');
                eventSource.close();
                
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectEventSource, 2000 * reconnectAttempts);
                } else {
                    console.log('❌ Max reconnection attempts reached');
                }
            };
            
            eventSource.onopen = function() {
                console.log('✅ EventBridge connected to food service');
                reconnectAttempts = 0;
            };
        } catch (error) {
            console.error('Food EventBridge setup failed:', error);
        }
    }
    
    connectEventSource();
    
    // Fallback polling
    setInterval(() => {
        loadMenu();
    }, 60000);
}

async function loadMenu() {
    try {
        const response = await fetch('/api/food-items');
        menuItems = await response.json();
        
        const menuGrid = document.getElementById('menuGrid');
        menuGrid.innerHTML = menuItems.map(item => `
            <div class="menu-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="menu-item-content">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="menu-item-footer">
                        <span class="price">₹${item.price}</span>
                        <button class="add-btn" onclick="addToCart(${item.id})">Add to Cart</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    const existingItem = cart.find(c => c.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    
    updateCart();
    showNotification(`${item.name} added to cart!`);
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCart();
}

function updateQuantity(itemId, change) {
    const item = cart.find(c => c.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            updateCart();
        }
    }
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('subtotal');
    const totalAmountEl = document.getElementById('totalAmount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const deliveryFeeEl = document.getElementById('deliveryFee');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        subtotalEl.textContent = '₹0';
        deliveryFeeEl.textContent = '₹50';
        totalAmountEl.textContent = '₹50';
        checkoutBtn.disabled = true;
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= 1000 ? 0 : 50;
    const total = subtotal + deliveryFee;
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} each</p>
            </div>
            <div class="quantity-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <span style="margin-left: 1rem; font-weight: bold;">₹${item.price * item.quantity}</span>
            </div>
        </div>
    `).join('');
    
    subtotalEl.textContent = `₹${subtotal}`;
    deliveryFeeEl.textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
    totalAmountEl.textContent = `₹${total}`;
    checkoutBtn.disabled = subtotal < 600;
    
    if (subtotal < 600) {
        checkoutBtn.textContent = `Minimum order ₹600 (₹${600 - subtotal} more needed)`;
    } else {
        checkoutBtn.textContent = 'Place Order';
    }
}

function openBookingModal() {
    if (cart.length === 0) return;
    
    const modal = document.getElementById('bookingModal');
    const orderSummary = document.getElementById('orderSummary');
    const modalSubtotal = document.getElementById('modalSubtotal');
    const modalTotal = document.getElementById('modalTotal');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= 1000 ? 0 : 50;
    const total = subtotal + deliveryFee;
    
    orderSummary.innerHTML = cart.map(item => `
        <div class="summary-item">
            <span>${item.name} x ${item.quantity}</span>
            <span>₹${item.price * item.quantity}</span>
        </div>
    `).join('');
    
    modalSubtotal.textContent = `₹${subtotal}`;
    document.querySelector('.total-summary .summary-row:nth-child(2) span:last-child').textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
    modalTotal.textContent = `₹${total}`;
    
    // Initialize with empty delivery slots - will be populated after booking validation
    const deliveryTimeSelect = document.getElementById('deliveryTime');
    deliveryTimeSelect.innerHTML = '<option value="">Enter booking ID first to see delivery slots</option>';
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function generateDeliveryTimeSlots() {
    const deliveryTimeSelect = document.getElementById('deliveryTime');
    const now = new Date();
    const minDeliveryTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    
    // Clear existing options except the first one
    deliveryTimeSelect.innerHTML = '<option value="">Select delivery time</option>';
    
    // Use check-in date from booking validation if available
    const checkInDate = window.checkInDate ? new Date(window.checkInDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    
    // Only allow delivery on check-in date
    if (checkInDate.getTime() !== today.getTime()) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = `Food delivery only available on your check-in date: ${checkInDate.toLocaleDateString('en-IN')}`;
        option.disabled = true;
        deliveryTimeSelect.appendChild(option);
        return;
    }
    
    // Set max time to 10 PM on check-in date
    const maxTime = new Date(checkInDate);
    maxTime.setHours(22, 0, 0, 0); // 10 PM on check-in date
    
    // Generate time slots until 10 PM on check-in date (every hour)
    let slotTime = new Date(Math.max(minDeliveryTime.getTime(), checkInDate.getTime() + 12 * 60 * 60 * 1000)); // Start from noon on check-in date or 3 hours from now
    
    while (slotTime <= maxTime) {
        const timeString = slotTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        const dateString = slotTime.toLocaleDateString('en-IN');
        const displayText = `${dateString} at ${timeString}`;
        const value = slotTime.toISOString();
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = displayText;
        deliveryTimeSelect.appendChild(option);
        
        // Move to next hour
        slotTime = new Date(slotTime.getTime() + 60 * 60 * 1000);
    }
    
    // If no slots available, show message
    if (deliveryTimeSelect.children.length === 1) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No delivery slots available (orders close at 10 PM on check-in date)';
        option.disabled = true;
        deliveryTimeSelect.appendChild(option);
    }
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingId').value = '';
    document.getElementById('phoneNumber').value = '';
    document.getElementById('customerEmail').value = '';
    document.body.style.overflow = 'auto';
}

// Add booking ID validation on input change
document.addEventListener('DOMContentLoaded', function() {
    loadMenu();
    updateCart();
    setTimeout(setupMenuSync, 1000);
    
    // Add event listener for booking ID validation
    const bookingIdInput = document.getElementById('bookingId');
    if (bookingIdInput) {
        bookingIdInput.addEventListener('blur', validateBookingId);
        bookingIdInput.addEventListener('input', function() {
            if (this.value.trim() === '') {
                const deliveryTimeSelect = document.getElementById('deliveryTime');
                if (deliveryTimeSelect) {
                    deliveryTimeSelect.innerHTML = '<option value="">Enter booking ID first to see delivery slots</option>';
                }
            }
        });
    }
});

async function validateBookingId() {
    const bookingId = document.getElementById('bookingId').value.trim();
    
    if (!bookingId) return;
    
    try {
        const validationResponse = await fetch(`/api/validate-booking/${bookingId}`);
        const validationResult = await validationResponse.json();
        
        if (!validationResult.valid) {
            showNotification(validationResult.error || 'Invalid booking ID', 'error');
            const deliveryTimeSelect = document.getElementById('deliveryTime');
            deliveryTimeSelect.innerHTML = '<option value="">Invalid booking ID</option>';
            return;
        }
        
        // Auto-fill guest details if available
        if (validationResult.booking) {
            document.getElementById('customerEmail').value = validationResult.booking.email;
            document.getElementById('phoneNumber').value = validationResult.booking.phone;
        }
        
        // Store check-in date for delivery slot validation
        window.checkInDate = validationResult.booking.checkIn;
        
        // Generate delivery slots based on check-in date
        generateDeliveryTimeSlots();
        
        showNotification('Booking ID validated successfully!', 'success');
    } catch (error) {
        showNotification('Error validating booking ID. Please try again.', 'error');
        const deliveryTimeSelect = document.getElementById('deliveryTime');
        deliveryTimeSelect.innerHTML = '<option value="">Error validating booking</option>';
    }
}

async function confirmOrder() {
    const bookingId = document.getElementById('bookingId').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const deliveryTime = document.getElementById('deliveryTime').value;
    
    if (!bookingId) {
        showNotification('Please enter your booking ID', 'error');
        return;
    }
    
    if (!phoneNumber) {
        showNotification('Please enter your phone number', 'error');
        return;
    }
    
    if (!customerEmail) {
        showNotification('Please enter your email', 'error');
        return;
    }
    
    if (!deliveryTime) {
        showNotification('Please select a delivery time', 'error');
        return;
    }
    
    // Check if booking was validated
    if (!window.checkInDate) {
        showNotification('Please validate your booking ID first', 'error');
        return;
    }
    
    // Check if current time is past 10 PM and if today is check-in date
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkInDate = new Date(window.checkInDate);
    checkInDate.setHours(0, 0, 0, 0);
    
    if (checkInDate.getTime() !== today.getTime()) {
        showNotification(`Food orders are only available on your check-in date: ${checkInDate.toLocaleDateString('en-IN')}`, 'error');
        return;
    }
    
    const today10PM = new Date();
    today10PM.setHours(22, 0, 0, 0);
    
    if (now > today10PM) {
        showNotification('Food orders are only accepted until 10 PM on the check-in date', 'error');
        return;
    }
    
    // Phone validation
    const phonePattern = /^(\+91|91)?[6-9]\d{9}$/;
    if (!phonePattern.test(phoneNumber.replace(/\s+/g, ''))) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(customerEmail)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= 1000 ? 0 : 50;
    const total = subtotal + deliveryFee;
    
    const orderData = {
        bookingId,
        phoneNumber,
        customerEmail,
        deliveryTime,
        items: cart,
        subtotal,
        deliveryFee,
        total
    };
    
    try {
        // Create food order first
        const response = await fetch('/api/food-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            orderData.orderId = result.orderId;
            
            // Show payment interface
            showPaymentInterface(orderData);
            closeModal();
        } else {
            showNotification('Failed to create order. Please try again.', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function showPaymentInterface(order) {
    const paymentModal = document.createElement('div');
    paymentModal.className = 'payment-modal';
    paymentModal.innerHTML = `
        <div class="payment-content">
            <h2>💳 Complete Payment</h2>
            <div class="booking-summary">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Booking ID:</strong> ${order.bookingId}</p>
                <p><strong>Phone:</strong> ${order.phoneNumber}</p>
                <p><strong>Items:</strong> ${order.items.length} items</p>
                <p><strong>Subtotal:</strong> ₹${order.subtotal.toLocaleString()}</p>
                <p><strong>Delivery Fee:</strong> ₹${order.deliveryFee}</p>
                <p><strong>Total Amount:</strong> ₹${order.total.toLocaleString()}</p>
            </div>
            
            <div class="payment-methods">
                <div class="payment-tabs">
                    <button class="payment-tab active" onclick="showPaymentMethod('upi')">🔗 UPI Payment</button>
                    <button class="payment-tab" onclick="showPaymentMethod('card')">💳 Card Payment</button>
                </div>
                
                <div id="upi-payment" class="payment-method active">
                    <div class="qr-section">
                        <img src="/qr-code.png.jpeg" alt="UPI QR Code" class="qr-code">
                        <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                        <p><strong>Amount:</strong> ₹${order.total.toLocaleString()}</p>
                    </div>
                    
                    <div class="payment-instructions">
                        <p>• Scan QR code or use UPI ID</p>
                        <p>• Pay exact amount</p>
                        <p>• Enter 12-digit UTR number below</p>
                    </div>
                    
                    <div class="payment-proof">
                        <input type="text" id="transactionId" placeholder="Enter 12-digit UTR number" maxlength="12" pattern="[0-9]{12}" required>
                        <button onclick="confirmFoodPayment()" class="confirm-payment-btn">
                            ✅ Confirm UPI Payment
                        </button>
                    </div>
                </div>
                
                <div id="card-payment" class="payment-method">
                    <div class="card-section">
                        <div class="card-pricing">
                            <p><strong>Base Amount:</strong> ₹${order.total.toLocaleString()}</p>
                            <p><strong>Transaction Fee (1.5%):</strong> ₹${Math.round(order.total * 0.015).toLocaleString()}</p>
                            <p style="font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;">
                                <strong>Total Card Payment:</strong> ₹${(order.total + Math.round(order.total * 0.015)).toLocaleString()}
                            </p>
                        </div>
                        <p>Pay securely with Debit/Credit Card</p>
                        <button onclick="payFoodWithCard(${order.total + Math.round(order.total * 0.015)})" class="razorpay-btn">
                            💳 Pay ₹${(order.total + Math.round(order.total * 0.015)).toLocaleString()} with Card
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="payment-actions">
                <button onclick="closeFoodPaymentModal()" class="close-payment-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
    window.currentFoodOrder = order;
}

function showPaymentMethod(method) {
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.payment-tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`${method}-payment`).classList.add('active');
    event.target.classList.add('active');
}

function closeFoodPaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) modal.remove();
    window.currentFoodOrder = null;
}

async function confirmFoodPayment() {
    const transactionId = document.getElementById('transactionId').value;
    
    if (!transactionId) {
        showNotification('Please enter your 12-digit UTR number', 'error');
        return;
    }
    
    if (!/^[0-9]{12}$/.test(transactionId)) {
        showNotification('UTR number must be exactly 12 digits', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/food-orders/${window.currentFoodOrder.orderId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactionId,
                paymentMethod: 'upi'
            })
        });
        
        if (response.ok) {
            showNotification('Food order payment submitted for verification. You will be notified once confirmed.', 'success');
            cart = [];
            updateCart();
            closeFoodPaymentModal();
        } else {
            showNotification('Payment submission failed. Please try again.', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

async function payFoodWithCard(amount) {
    try {
        const keyResponse = await fetch('/api/razorpay-key');
        const { key } = await keyResponse.json();
        
        const options = {
            key: key,
            amount: amount * 100,
            currency: 'INR',
            name: 'My Food - Vizag Resorts',
            description: 'Food Order Payment',
            handler: function(response) {
                handleFoodCardPayment(response.razorpay_payment_id);
            },
            prefill: {
                contact: window.currentFoodOrder.phoneNumber
            },
            theme: {
                color: '#667eea'
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        showNotification('Payment system error. Please try UPI payment.', 'error');
    }
}

async function handleFoodCardPayment(paymentId) {
    try {
        const response = await fetch(`/api/food-orders/${window.currentFoodOrder.orderId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentId,
                paymentMethod: 'card'
            })
        });
        
        if (response.ok) {
            showNotification('Food order payment submitted for verification. You will be notified once confirmed.', 'success');
            cart = [];
            updateCart();
            closeFoodPaymentModal();
        } else {
            showNotification('Payment submission failed. Please try again.', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 3000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Smooth scrolling for navigation links
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target === modal) {
        closeModal();
    }
});