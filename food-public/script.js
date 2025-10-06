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
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingId').value = '';
    document.getElementById('phoneNumber').value = '';
}

function confirmOrder() {
    const bookingId = document.getElementById('bookingId').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    
    if (!bookingId) {
        showNotification('Please enter your booking ID', 'error');
        return;
    }
    
    if (!phoneNumber) {
        showNotification('Please enter your phone number', 'error');
        return;
    }
    
    // Phone validation
    const phonePattern = /^(\+91|91)?[6-9]\d{9}$/;
    if (!phonePattern.test(phoneNumber.replace(/\s+/g, ''))) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + 50;
    
    const orderData = {
        bookingId,
        phoneNumber,
        items: cart,
        subtotal,
        deliveryFee: 50,
        total,
        orderTime: new Date().toISOString()
    };
    
    // Simulate order submission
    console.log('Order submitted:', orderData);
    
    showNotification('Order confirmed! We will deliver your food within 45 minutes.', 'success');
    
    // Clear cart and close modal
    cart = [];
    updateCart();
    closeModal();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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