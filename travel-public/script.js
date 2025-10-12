// Travel packages data
const travelPackages = [
    {
        id: 1,
        name: "Araku Valley Tour",
        description: "Full day trip to scenic Araku Valley with coffee plantations and tribal museum",
        duration: "8-10 hours",
        price: 2500,
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
    },
    {
        id: 2,
        name: "Borra Caves Adventure",
        description: "Explore the famous limestone caves with stalactites and stalagmites",
        duration: "6-8 hours",
        price: 1800,
        image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400"
    },
    {
        id: 3,
        name: "Beach Hopping Tour",
        description: "Visit RK Beach, Rushikonda, and Yarada Beach in one day",
        duration: "4-6 hours",
        price: 1200,
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400"
    },
    {
        id: 4,
        name: "Kailasagiri Hill Station",
        description: "Cable car ride and panoramic views of Vizag city and coastline",
        duration: "3-4 hours",
        price: 800,
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
    },
    {
        id: 5,
        name: "Submarine Museum & INS Kurusura",
        description: "Explore the submarine museum and maritime heritage",
        duration: "2-3 hours",
        price: 600,
        image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400"
    },
    {
        id: 6,
        name: "Simhachalam Temple Tour",
        description: "Visit the ancient Narasimha temple with architectural marvels",
        duration: "3-4 hours",
        price: 700,
        image: "https://images.unsplash.com/photo-1582632502788-e3d2e7e8e5e5?w=400"
    }
];

let selectedPackages = [];

// Load packages on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPackages();
    updateBookingSummary();
    initBannerRotation();
    setupEventBridgeSync();
});

// Banner rotation functionality
function initBannerRotation() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.banner-slide');
    const totalSlides = slides.length;

    function nextSlide() {
        if (slides.length > 0) {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % totalSlides;
            slides[currentSlide].classList.add('active');
        }
    }

    // Start banner rotation every 8 seconds
    if (slides.length > 1) {
        setInterval(nextSlide, 8000);
    }
}

// Smooth scrolling function for hero section buttons
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function loadPackages() {
    const packagesGrid = document.getElementById('packagesGrid');
    packagesGrid.innerHTML = '';

    travelPackages.forEach(package => {
        const packageCard = document.createElement('div');
        packageCard.className = 'package-item';
        packageCard.innerHTML = `
            <img src="${package.image}" alt="${package.name}" onerror="this.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'">
            <div class="package-item-content">
                <h3>${package.name}</h3>
                <p>${package.description}</p>
                <div class="package-duration">Duration: ${package.duration}</div>
                <div class="package-item-footer">
                    <span class="price">₹${package.price}</span>
                    <button class="book-btn" onclick="addPackage(${package.id})">Add Package</button>
                </div>
            </div>
        `;
        packagesGrid.appendChild(packageCard);
    });
}

function addPackage(packageId) {
    const package = travelPackages.find(p => p.id === packageId);
    const existingPackage = selectedPackages.find(p => p.id === packageId);

    if (existingPackage) {
        existingPackage.quantity += 1;
    } else {
        selectedPackages.push({
            ...package,
            quantity: 1
        });
    }

    updateBookingSummary();
}

function removePackage(packageId) {
    const packageIndex = selectedPackages.findIndex(p => p.id === packageId);
    if (packageIndex > -1) {
        if (selectedPackages[packageIndex].quantity > 1) {
            selectedPackages[packageIndex].quantity -= 1;
        } else {
            selectedPackages.splice(packageIndex, 1);
        }
    }
    updateBookingSummary();
}

function updatePackageQuantity(packageId, change) {
    const package = selectedPackages.find(p => p.id === packageId);
    if (package) {
        package.quantity += change;
        if (package.quantity <= 0) {
            removePackage(packageId);
        }
    }
    updateBookingSummary();
}

function updateBookingSummary() {
    const bookingItems = document.getElementById('bookingItems');
    const subtotalElement = document.getElementById('subtotal');
    const totalAmountElement = document.getElementById('totalAmount');
    const bookNowBtn = document.getElementById('bookNowBtn');

    if (selectedPackages.length === 0) {
        bookingItems.innerHTML = '<p class="empty-booking">No packages selected</p>';
        subtotalElement.textContent = '₹0';
        totalAmountElement.textContent = '₹0';
        bookNowBtn.disabled = true;
        return;
    }

    let subtotal = 0;
    let itemsHTML = '';

    selectedPackages.forEach(package => {
        const itemTotal = package.price * package.quantity;
        subtotal += itemTotal;

        itemsHTML += `
            <div class="booking-item">
                <div class="booking-item-info">
                    <h4>${package.name}</h4>
                    <p>₹${package.price} × ${package.quantity} = ₹${itemTotal}</p>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updatePackageQuantity(${package.id}, -1)">-</button>
                    <span>${package.quantity}</span>
                    <button class="qty-btn" onclick="updatePackageQuantity(${package.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    bookingItems.innerHTML = itemsHTML;
    subtotalElement.textContent = `₹${subtotal}`;
    totalAmountElement.textContent = `₹${subtotal}`;
    bookNowBtn.disabled = false;
}

function openBookingModal() {
    const modal = document.getElementById('bookingModal');
    const modalTotal = document.getElementById('modalTotal');
    const bookingSummary = document.getElementById('bookingSummary');

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travelDate').min = today;

    // Update modal summary
    let summaryHTML = '';
    let total = 0;

    selectedPackages.forEach(package => {
        const itemTotal = package.price * package.quantity;
        total += itemTotal;
        summaryHTML += `
            <div class="summary-item">
                <span>${package.name} × ${package.quantity}</span>
                <span>₹${itemTotal}</span>
            </div>
        `;
    });

    bookingSummary.innerHTML = summaryHTML;
    modalTotal.textContent = `₹${total}`;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

function confirmBooking() {
    const customerName = document.getElementById('customerName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const travelDate = document.getElementById('travelDate').value;
    const pickupLocation = document.getElementById('pickupLocation').value;

    if (!customerName || !phoneNumber || !customerEmail || !travelDate || !pickupLocation) {
        alert('Please fill in all required fields');
        return;
    }

    // Calculate total
    const total = selectedPackages.reduce((sum, package) => sum + (package.price * package.quantity), 0);

    // Create booking data
    const bookingData = {
        customer_name: customerName,
        phone: phoneNumber,
        email: customerEmail,
        travel_date: travelDate,
        pickup_location: pickupLocation,
        packages: selectedPackages,
        total_amount: total
    };

    // Show payment options
    showPaymentModal(bookingData);
}

function showPaymentModal(bookingData) {
    closeModal();
    
    // Store booking data globally
    window.currentTravelBooking = bookingData;
    
    // Create payment modal
    const paymentModal = document.createElement('div');
    paymentModal.className = 'modal payment-modal';
    paymentModal.innerHTML = `
        <div class="modal-content payment-content">
            <span class="close" onclick="closePaymentModal()">&times;</span>
            <h2>Complete Payment</h2>
            
            <div class="booking-summary">
                <h3>Booking Details</h3>
                <p><strong>Name:</strong> ${bookingData.customer_name}</p>
                <p><strong>Phone:</strong> ${bookingData.phone}</p>
                <p><strong>Travel Date:</strong> ${bookingData.travel_date}</p>
                <p><strong>Pickup:</strong> ${bookingData.pickup_location}</p>
                <p><strong>Total Amount:</strong> ₹${bookingData.total_amount}</p>
            </div>

            <div class="payment-tabs">
                <div class="payment-tab active" onclick="switchPaymentTab('upi')">
                    <h4>UPI Payment</h4>
                </div>
                <div class="payment-tab" onclick="switchPaymentTab('card')">
                    <h4>Card Payment</h4>
                </div>
            </div>

            <div id="upiPayment" class="payment-method active">
                <div class="qr-section">
                    <img src="/qr-code.png.jpeg" alt="UPI QR Code" class="qr-code">
                    <p><strong>Scan & Pay ₹${bookingData.total_amount}</strong></p>
                </div>
                <div class="payment-instructions">
                    <h4>Payment Instructions:</h4>
                    <ol>
                        <li>Scan the QR code with any UPI app</li>
                        <li>Enter amount: ₹${bookingData.total_amount}</li>
                        <li>Complete the payment</li>
                        <li>Enter the 12-digit UTR number below</li>
                    </ol>
                </div>
                <div class="payment-proof">
                    <input type="text" id="utrNumber" placeholder="Enter 12-digit UTR number" maxlength="12">
                    <button class="confirm-payment-btn" onclick="confirmUPIPayment()">
                        Confirm Payment
                    </button>
                </div>
            </div>

            <div id="cardPayment" class="payment-method">
                <div class="card-pricing">
                    <p><strong>Card Payment Amount: ₹${Math.round(bookingData.total_amount * 1.02)}</strong></p>
                    <small>*2% processing fee included</small>
                </div>
                <button class="razorpay-btn" onclick="initiateRazorpayPayment()">
                    Pay with Card/UPI
                </button>
            </div>

            <div class="payment-actions">
                <button class="close-payment-btn" onclick="closePaymentModal()">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(paymentModal);
}

function switchPaymentTab(method) {
    // Update tabs
    document.querySelectorAll('.payment-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.payment-method').forEach(method => method.classList.remove('active'));
    
    event.target.closest('.payment-tab').classList.add('active');
    document.getElementById(method + 'Payment').classList.add('active');
}

function closePaymentModal() {
    const paymentModal = document.querySelector('.payment-modal');
    if (paymentModal) {
        paymentModal.remove();
    }
}

function confirmUPIPayment() {
    const bookingData = window.currentTravelBooking;
    const utrNumber = document.getElementById('utrNumber').value;

    if (!utrNumber || utrNumber.length !== 12) {
        showNotification('Please enter a valid 12-digit UTR number', 'error');
        return;
    }

    console.log('🚗 Creating travel booking first...');
    
    fetch('/api/travel-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Travel booking created, now submitting payment...');
            return fetch(`/api/travel-bookings/${data.booking_id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_method: 'upi',
                    transaction_id: utrNumber
                })
            });
        } else {
            throw new Error(data.error || 'Failed to create booking');
        }
    })
    .then(response => response.json())
    .then(paymentData => {
        if (paymentData.success) {
            closePaymentModal();
            showNotification('Travel booking payment submitted for verification. You will be notified once confirmed.', 'success');
            selectedPackages = [];
            updateBookingSummary();
        } else {
            throw new Error(paymentData.error || 'Payment submission failed');
        }
    })
    .catch(error => {
        console.error('❌ Travel booking/payment error:', error);
        showNotification(error.message || 'An error occurred. Please try again.', 'error');
    });
}

async function initiateRazorpayPayment() {
    try {
        const bookingData = window.currentTravelBooking;
        
        const keyResponse = await fetch('/api/razorpay-key');
        const { key } = await keyResponse.json();
        
        const amount = Math.round(bookingData.total_amount * 1.02 * 100);

        const options = {
            key: key,
            amount: amount,
            currency: 'INR',
            name: 'Vizag Resort Booking',
            description: 'Travel Package Booking',
            handler: function(response) {
                handleTravelCardPayment(bookingData, response.razorpay_payment_id);
            },
            prefill: {
                name: bookingData.customer_name,
                email: bookingData.email,
                contact: bookingData.phone
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

function handleTravelCardPayment(bookingData, paymentId) {
    console.log('💳 Processing travel card payment...');
    
    fetch('/api/travel-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Travel booking created, now submitting card payment...');
            return fetch(`/api/travel-bookings/${data.booking_id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_method: 'card',
                    transaction_id: paymentId
                })
            });
        } else {
            throw new Error(data.error || 'Failed to create booking');
        }
    })
    .then(response => response.json())
    .then(paymentData => {
        if (paymentData.success) {
            closePaymentModal();
            showNotification('Travel booking payment submitted for verification. You will be notified once confirmed.', 'success');
            selectedPackages = [];
            updateBookingSummary();
        } else {
            throw new Error(paymentData.error || 'Payment submission failed');
        }
    })
    .catch(error => {
        console.error('❌ Travel card payment error:', error);
        showNotification(error.message || 'Payment processing failed. Please try again.', 'error');
    });
}

function submitTravelBooking(bookingData) {
    console.log('🚗 Submitting travel booking:', bookingData);
    
    fetch('/api/travel-bookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
    })
    .then(response => {
        console.log('📥 Travel booking response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('📋 Travel booking response:', data);
        if (data.success) {
            closePaymentModal();
            showNotification(`Travel booking confirmed! Your booking reference is: ${data.booking_reference}`, 'success');
            
            // Reset form
            selectedPackages = [];
            updateBookingSummary();
        } else {
            showNotification('Booking failed: ' + (data.error || data.message), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Travel booking error:', error);
        showNotification('Network error. Please try again.', 'error');
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    const paymentModal = document.querySelector('.payment-modal');
    
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === paymentModal) {
        closePaymentModal();
    }
}

// EventBridge real-time sync
function setupEventBridgeSync() {
    console.log('📡 Travel EventBridge sync enabled');
    
    try {
        const eventSource = new EventSource('/api/events');
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📡 Travel EventBridge event:', data);
                
                if (data.type === 'travel.booking.created' || data.type === 'travel.booking.updated') {
                    console.log('🚗 Travel booking update detected');
                    showNotification('New travel booking activity detected!', 'info');
                }
                
                if (data.type === 'booking.created' || data.type === 'booking.updated') {
                    console.log('🏨 Resort booking update detected');
                }
                
            } catch (error) {
                console.log('📡 EventBridge ping:', event.data);
            }
        };
        
        eventSource.onerror = function(error) {
            console.log('⚠️ Travel EventBridge error:', error);
        };
        
        eventSource.onopen = function() {
            console.log('✅ Travel EventBridge connected');
        };
    } catch (error) {
        console.error('Travel EventBridge setup failed:', error);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 3000;
        font-size: 14px;
        max-width: 300px;
        background: ${type === 'info' ? '#17a2b8' : type === 'success' ? '#28a745' : '#dc3545'};
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}