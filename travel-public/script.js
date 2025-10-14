// Travel packages data - loaded from database
let travelPackages = [];
let selectedPackages = [];

// Load packages on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPackagesFromDatabase();
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

async function loadPackagesFromDatabase() {
    try {
        const response = await fetch('/api/travel-packages');
        travelPackages = await response.json();
        loadPackages();
    } catch (error) {
        console.error('Error loading travel packages:', error);
        const packagesGrid = document.getElementById('packagesGrid');
        packagesGrid.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No travel packages available at the moment.</p>';
    }
}

function loadPackages() {
    const packagesGrid = document.getElementById('packagesGrid');
    packagesGrid.innerHTML = '';

    if (!travelPackages || travelPackages.length === 0) {
        packagesGrid.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No travel packages available at the moment.</p>';
        return;
    }

    travelPackages.forEach(package => {
        const packageCard = document.createElement('div');
        packageCard.className = 'package-item';
        packageCard.innerHTML = `
            <img src="${package.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'}" alt="${package.name}" onerror="this.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'">
            <div class="package-item-content">
                <h3>${package.name}</h3>
                <p>${package.description}</p>
                <div class="package-duration">Duration: ${package.duration}</div>
                <div class="package-item-footer">
                    <span class="price">₹${package.price}</span>
                    <button class="book-btn" onclick="bookPackage(${package.id})">Book Now</button>
                </div>
            </div>
        `;
        packagesGrid.appendChild(packageCard);
    });
}

function bookPackage(packageId) {
    const package = travelPackages.find(p => p.id === packageId);
    if (!package) return;
    
    const existingPackage = selectedPackages.find(p => p.id === packageId);
    if (existingPackage) {
        existingPackage.quantity += 1;
    } else {
        selectedPackages.push({
            ...package,
            quantity: 1,
            carType: '5-seater',
            carMultiplier: 1
        });
    }
    
    openBookingModal();
}

function addPackage(packageId) {
    const package = travelPackages.find(p => p.id === packageId);
    const existingPackage = selectedPackages.find(p => p.id === packageId);

    if (existingPackage) {
        existingPackage.quantity += 1;
    } else {
        selectedPackages.push({
            ...package,
            quantity: 1,
            carType: '5-seater',
            carMultiplier: 1
        });
    }
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
    updateModalSummary();
}

function updatePackageCarType(packageId, carType) {
    const package = selectedPackages.find(p => p.id === packageId);
    if (package) {
        package.carType = carType;
        const multipliers = {
            '5-seater': 1,
            '7-seater': 1.2,
            '12-seater': 1.5,
            '14-seater': 1.7
        };
        package.carMultiplier = multipliers[carType] || 1;
    }
    updateModalSummary();
}

function removePackage(packageId) {
    const packageIndex = selectedPackages.findIndex(p => p.id === packageId);
    if (packageIndex > -1) {
        selectedPackages.splice(packageIndex, 1);
    }
    updateModalSummary();
}

function openBookingModal() {
    if (selectedPackages.length === 0) {
        showNotification('Please select at least one package', 'error');
        return;
    }
    
    const modal = document.getElementById('bookingModal');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travelDate').min = today;
    
    // Update modal summary
    updateModalSummary();
    modal.style.display = 'block';
}

function updateModalSummary() {
    const modalTotal = document.getElementById('modalTotal');
    const bookingSummary = document.getElementById('bookingSummary');
    
    if (!modalTotal || !bookingSummary) return;
    
    let summaryHTML = '';
    let grandTotal = 0;
    
    selectedPackages.forEach(package => {
        const basePrice = package.price * package.quantity;
        const finalPrice = Math.round(basePrice * (package.carMultiplier || 1));
        grandTotal += finalPrice;
        
        summaryHTML += `
            <div class="package-summary">
                <div class="package-header">
                    <h4>${package.name}</h4>
                    <button class="remove-package" onclick="removePackage(${package.id})" title="Remove package">×</button>
                </div>
                <div class="package-details">
                    <div class="quantity-control">
                        <label>Quantity:</label>
                        <div class="qty-controls">
                            <button onclick="updatePackageQuantity(${package.id}, -1)">-</button>
                            <span>${package.quantity}</span>
                            <button onclick="updatePackageQuantity(${package.id}, 1)">+</button>
                        </div>
                    </div>
                    <div class="car-selection">
                        <label>Car Type:</label>
                        <select onchange="updatePackageCarType(${package.id}, this.value)">
                            <option value="5-seater" ${package.carType === '5-seater' ? 'selected' : ''}>5 Seater (Base)</option>
                            <option value="7-seater" ${package.carType === '7-seater' ? 'selected' : ''}>7 Seater (+20%)</option>
                            <option value="12-seater" ${package.carType === '12-seater' ? 'selected' : ''}>12 Seater (+50%)</option>
                            <option value="14-seater" ${package.carType === '14-seater' ? 'selected' : ''}>14 Seater (+70%)</option>
                        </select>
                    </div>
                    <div class="package-pricing">
                        <span>₹${package.price} × ${package.quantity} × ${package.carMultiplier} = ₹${finalPrice}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    bookingSummary.innerHTML = summaryHTML;
    modalTotal.textContent = `₹${grandTotal}`;
}



function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

function selectPayment(method) {
    document.getElementById(method).checked = true;
}

function confirmBooking() {
    const customerName = document.getElementById('customerName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const travelDate = document.getElementById('travelDate').value;
    const pickupLocation = document.getElementById('pickupLocation').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (!customerName || !phoneNumber || !customerEmail || !travelDate || !pickupLocation) {
        alert('Please fill in all required fields');
        return;
    }

    if (selectedPackages.length === 0) {
        alert('Please select at least one package');
        return;
    }

    // Calculate total with individual car multipliers
    let total = selectedPackages.reduce((sum, package) => {
        return sum + Math.round(package.price * package.quantity * (package.carMultiplier || 1));
    }, 0);
    
    // Add 2% for card payment
    if (paymentMethod === 'card') {
        total = Math.round(total * 1.02);
    }

    // Create booking data
    const bookingData = {
        customer_name: customerName,
        phone: phoneNumber,
        email: customerEmail,
        travel_date: travelDate,
        pickup_location: pickupLocation,
        packages: selectedPackages,
        total_amount: total,
        payment_method: paymentMethod
    };

    // Show payment modal
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
                <div class="packages-summary">
                    <h4>Selected Packages:</h4>
                    ${bookingData.packages.map(pkg => `
                        <div class="package-item">
                            <span>${pkg.name} × ${pkg.quantity}</span>
                            <span>${pkg.carType}</span>
                            <span>₹${Math.round(pkg.price * pkg.quantity * pkg.carMultiplier)}</span>
                        </div>
                    `).join('')}
                </div>
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
    console.log('💳 initiateRazorpayPayment() called');
    
    // Load Razorpay if not already loaded
    if (typeof Razorpay === 'undefined') {
        console.log('📦 Loading Razorpay script...');
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            console.log('✅ Razorpay script loaded, retrying payment...');
            setTimeout(() => initiateRazorpayPayment(), 500);
        };
        script.onerror = () => {
            console.error('❌ Failed to load Razorpay script');
            showNotification('Payment system unavailable. Please use UPI payment.', 'error');
        };
        document.head.appendChild(script);
        return;
    }
    
    try {
        const bookingData = window.currentTravelBooking;
        
        console.log('🔑 Fetching Razorpay key...');
        const keyResponse = await fetch('/api/razorpay-key');
        const keyData = await keyResponse.json();
        
        if (!keyData.key) {
            console.error('❌ No Razorpay key received');
            showNotification('Payment system not configured. Please use UPI payment.', 'error');
            return;
        }
        
        const amount = Math.round(bookingData.total_amount * 1.02 * 100);
        console.log('💰 Payment amount:', amount / 100);

        const options = {
            key: keyData.key,
            amount: amount,
            currency: 'INR',
            name: 'Vizag Resort Booking',
            description: 'Travel Package Booking',
            handler: function(response) {
                console.log('✅ Razorpay payment successful:', response.razorpay_payment_id);
                handleTravelCardPayment(bookingData, response.razorpay_payment_id);
            },
            prefill: {
                name: bookingData.customer_name,
                email: bookingData.email,
                contact: bookingData.phone
            },
            theme: {
                color: '#667eea'
            },
            modal: {
                ondismiss: function() {
                    console.log('❌ Payment cancelled by user');
                }
            }
        };

        console.log('🚀 Opening Razorpay checkout...');
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error('❌ Payment system error:', error);
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
            currentPackage = null;
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
            currentPackage = null;
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
                
                if (data.type === 'travel.package.created' || data.type === 'travel.package.updated' || data.type === 'travel.package.deleted') {
                    console.log('📦 Travel package update detected - refreshing packages');
                    loadPackagesFromDatabase();
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
    const isBookingConfirmation = message.includes('submitted for verification') || message.includes('confirmed');
    
    const notification = document.createElement('div');
    
    if (isBookingConfirmation && type === 'success') {
        notification.innerHTML = `
            <div class="notification-content">
                <div class="success-icon">🚗</div>
                <div class="notification-text">
                    <strong>Travel Booked!</strong><br>
                    ${message}
                </div>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 2rem;
            border-radius: 15px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(40, 167, 69, 0.3);
            font-size: 16px;
            max-width: 400px;
            text-align: center;
            animation: bookingPulse 0.6s ease-out;
            border: 3px solid #fff;
        `;
    } else {
        notification.textContent = message;
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
    }
    
    document.body.appendChild(notification);
    
    if (isBookingConfirmation && !document.getElementById('booking-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'booking-animation-styles';
        style.textContent = `
            @keyframes bookingPulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            .success-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: bounce 1s infinite alternate;
            }
            @keyframes bounce {
                0% { transform: translateY(0); }
                100% { transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    const duration = isBookingConfirmation ? 10000 : 5000;
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}