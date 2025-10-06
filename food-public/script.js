let cart = [];
let menuItems = [
    {
        id: 1,
        name: "Chicken Biryani",
        description: "Aromatic basmati rice with tender chicken pieces and traditional spices",
        price: 250,
        image: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400"
    },
    {
        id: 2,
        name: "Paneer Butter Masala",
        description: "Creamy tomato-based curry with soft paneer cubes",
        price: 180,
        image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400"
    },
    {
        id: 3,
        name: "Fish Curry",
        description: "Fresh fish cooked in coconut-based spicy curry",
        price: 220,
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400"
    },
    {
        id: 4,
        name: "Veg Fried Rice",
        description: "Wok-tossed rice with fresh vegetables and soy sauce",
        price: 150,
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400"
    },
    {
        id: 5,
        name: "Mutton Curry",
        description: "Tender mutton pieces in rich, spicy gravy",
        price: 300,
        image: "https://images.unsplash.com/photo-1574653853027-5d3ac9b9e7c7?w=400"
    },
    {
        id: 6,
        name: "Dal Tadka",
        description: "Yellow lentils tempered with cumin and spices",
        price: 120,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400"
    },
    {
        id: 7,
        name: "Chicken Tikka",
        description: "Grilled chicken marinated in yogurt and spices",
        price: 200,
        image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400"
    },
    {
        id: 8,
        name: "Naan Bread",
        description: "Soft, fluffy Indian bread baked in tandoor",
        price: 40,
        image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=400"
    }
];

document.addEventListener('DOMContentLoaded', function() {
    loadMenu();
    updateCart();
});

function loadMenu() {
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
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        subtotalEl.textContent = '₹0';
        totalAmountEl.textContent = '₹50';
        checkoutBtn.disabled = true;
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 50;
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
    totalAmountEl.textContent = `₹${total}`;
    checkoutBtn.disabled = false;
}

function openBookingModal() {
    if (cart.length === 0) return;
    
    const modal = document.getElementById('bookingModal');
    const orderSummary = document.getElementById('orderSummary');
    const modalSubtotal = document.getElementById('modalSubtotal');
    const modalTotal = document.getElementById('modalTotal');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + 50;
    
    orderSummary.innerHTML = cart.map(item => `
        <div class="summary-item">
            <span>${item.name} x ${item.quantity}</span>
            <span>₹${item.price * item.quantity}</span>
        </div>
    `).join('');
    
    modalSubtotal.textContent = `₹${subtotal}`;
    modalTotal.textContent = `₹${total}`;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingId').value = '';
    document.getElementById('phoneNumber').value = '';
    document.getElementById('customerEmail').value = '';
    document.body.style.overflow = 'auto';
}

async function confirmOrder() {
    const bookingId = document.getElementById('bookingId').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    
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
    const total = subtotal + 50;
    
    const orderData = {
        bookingId,
        phoneNumber,
        customerEmail,
        items: cart,
        subtotal,
        deliveryFee: 50,
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