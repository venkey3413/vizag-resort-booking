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
        const hasGallery = package.gallery && package.gallery.trim();
        const hasImage = package.image && package.image.trim();
        console.log(`Package ${package.id}: hasGallery=${hasGallery}, hasImage=${hasImage}, sites=${package.sites}`);
        packageCard.innerHTML = `
            <div class="package-image-container">
                <img src="${package.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'}" alt="${package.name}" onerror="this.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'">
                ${hasGallery || hasImage ? `<button class="view-more-btn" onclick="viewPackageGallery(${package.id})">📸 View More</button>` : ''}
            </div>
            <div class="package-item-content">
                <h3>${package.name}</h3>
                <div class="description-container">
                    <p class="description-short" id="desc-short-${package.id}">${package.description.length > 100 ? package.description.substring(0, 100) + '...' : package.description}</p>
                    <p class="description-full" id="desc-full-${package.id}" style="display: none;">${package.description}</p>
                    ${package.description.length > 100 ? `<button class="view-more-desc" onclick="toggleDescription(${package.id})">View More</button>` : ''}
                </div>
                <div class="package-duration">Duration: ${package.duration}</div>
                ${package.sites ? `
                    <div class="package-sites">
                        <h4>🏞️ Sites to Visit:</h4>
                        <div class="sites-list">
                            ${package.sites.split('\n').filter(site => site.trim()).map(site => 
                                `<span class="site-tag">${site.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
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
    
    // Clear previous selections and set only this package
    const defaultPrice = package.car_pricing && package.car_pricing['5_seater'] ? package.car_pricing['5_seater'] : package.price;
    selectedPackages = [{
        ...package,
        quantity: 1,
        carType: '5-seater',
        selectedPrice: defaultPrice
    }];
    
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

// Legacy functions for compatibility - now handled by new stage system
function updatePackageQuantity(packageId, change) {
    // Not used in new single-package flow
}

function updatePackageCarType(packageId, carType) {
    // Handled by selectCarType function
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
    
    const panel = document.getElementById('bookingPanel');
    const overlay = document.getElementById('panelOverlay');
    
    // Show stage 1 (package selection)
    showPackageSelectionStage();
    
    // Block same-day booking - set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const travelDateInput = document.getElementById('travelDate');
    travelDateInput.min = tomorrowStr;
    travelDateInput.value = tomorrowStr;
    
    // Add validation to prevent same-day booking
    travelDateInput.addEventListener('change', function() {
        const selectedDate = this.value;
        const today = new Date().toISOString().split('T')[0];
        
        if (selectedDate === today) {
            showCenterNotification('Same-day travel booking is not allowed. Please select tomorrow or a future date.', 'error');
            this.value = tomorrowStr;
        }
    });
    
    // Show panel with animation
    overlay.style.display = 'block';
    panel.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showPackageSelectionStage() {
    document.getElementById('packageSelectionStage').style.display = 'block';
    document.getElementById('customerDetailsStage').style.display = 'none';
    
    updatePackageDisplay();
    updateCarTypeOptions();
    updateModalTotal();
}

function updatePackageDisplay() {
    const selectedPackageDisplay = document.getElementById('selectedPackageDisplay');
    if (!selectedPackageDisplay || selectedPackages.length === 0) return;
    
    const package = selectedPackages[0];
    selectedPackageDisplay.innerHTML = `
        <div class="selected-package-card">
            <img src="${package.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'}" alt="${package.name}" class="package-thumb">
            <div class="package-info">
                <h4>${package.name}</h4>
                <p class="package-duration">Duration: ${package.duration}</p>
                <p class="package-base-price">Base Price: ₹${package.price}</p>
            </div>
        </div>
    `;
}

function updateCarTypeOptions() {
    const carTypeOptions = document.getElementById('carTypeOptions');
    if (!carTypeOptions || selectedPackages.length === 0) return;
    
    const package = selectedPackages[0];
    const carTypes = [
        { type: '5-seater', label: '5 Seater', key: '5_seater' },
        { type: '7-seater', label: '7 Seater', key: '7_seater' },
        { type: '12-seater', label: '12 Seater', key: '12_seater' },
        { type: '14-seater', label: '14 Seater', key: '14_seater' }
    ];
    
    carTypeOptions.innerHTML = carTypes.map(car => {
        const price = package.car_pricing && package.car_pricing[car.key] ? package.car_pricing[car.key] : package.price;
        return `
            <div class="car-type-option ${package.carType === car.type ? 'selected' : ''}" onclick="selectCarType('${car.type}', ${price})">
                <div class="car-type-info">
                    <span class="car-type-name">${car.label}</span>
                    <span class="car-type-price">₹${price}</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectCarType(carType, price) {
    if (selectedPackages.length > 0) {
        selectedPackages[0].carType = carType;
        selectedPackages[0].selectedPrice = price;
        updateCarTypeOptions();
        updateModalTotal();
    }
}

function updateModalTotal() {
    const modalTotal = document.getElementById('modalTotal');
    if (!modalTotal || selectedPackages.length === 0) return;
    
    const package = selectedPackages[0];
    const total = package.selectedPrice || package.price;
    modalTotal.textContent = `₹${total}`;
}

function proceedToCustomerDetails() {
    document.getElementById('packageSelectionStage').style.display = 'none';
    document.getElementById('customerDetailsStage').style.display = 'block';
    
    updateMiniPackageSummary();
}

function updateMiniPackageSummary() {
    const miniSummary = document.getElementById('miniPackageSummary');
    if (!miniSummary || selectedPackages.length === 0) return;
    
    const package = selectedPackages[0];
    const total = package.selectedPrice || package.price;
    
    miniSummary.innerHTML = `
        <div class="mini-summary">
            <span class="package-name">${package.name}</span>
            <span class="car-type">${package.carType}</span>
            <span class="total-amount">₹${total}</span>
        </div>
    `;
}

function goBackToPackageSelection() {
    document.getElementById('customerDetailsStage').style.display = 'none';
    document.getElementById('packageSelectionStage').style.display = 'block';
}



function closeModal() {
    closePanel();
}

function closePanel() {
    const panel = document.getElementById('bookingPanel');
    const overlay = document.getElementById('panelOverlay');
    
    panel.classList.remove('active');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
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
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (selectedPackages.length === 0) {
        showNotification('Please select a package', 'error');
        return;
    }

    // Calculate total
    const package = selectedPackages[0];
    let total = package.selectedPrice || package.price;
    
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
    closePanel();
    
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
                    <h4>Selected Package:</h4>
                    ${bookingData.packages.map(pkg => `
                        <div class="package-item">
                            <span>${pkg.name}</span>
                            <span>${pkg.carType}</span>
                            <span>₹${pkg.selectedPrice || pkg.price}</span>
                        </div>
                    `).join('')}
                </div>
                <p><strong>Total Amount:</strong> ₹${bookingData.total_amount}</p>
            </div>

            <div class="payment-tabs">
                <div class="payment-tab ${bookingData.payment_method === 'upi' ? 'active' : ''}" onclick="switchPaymentTab('upi')">
                    <h4>UPI Payment</h4>
                </div>
                <div class="payment-tab ${bookingData.payment_method === 'card' ? 'active' : ''}" onclick="switchPaymentTab('card')">
                    <h4>Card Payment</h4>
                </div>
            </div>

            <div id="upiPayment" class="payment-method ${bookingData.payment_method === 'upi' ? 'active' : ''}">
                <div class="qr-section">
                    <img src="/qr-code.png.jpeg" alt="UPI QR Code" class="qr-code">
                    <p><strong>Scan & Pay ₹${bookingData.payment_method === 'upi' ? bookingData.total_amount : Math.round(bookingData.total_amount / 1.02)}</strong></p>
                </div>
                <div class="payment-instructions">
                    <h4>Payment Instructions:</h4>
                    <ol>
                        <li>Scan the QR code with any UPI app</li>
                        <li>Enter amount: ₹${bookingData.payment_method === 'upi' ? bookingData.total_amount : Math.round(bookingData.total_amount / 1.02)}</li>
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

            <div id="cardPayment" class="payment-method ${bookingData.payment_method === 'card' ? 'active' : ''}">
                <div class="card-pricing">
                    <p><strong>Card Payment Amount: ₹${bookingData.payment_method === 'card' ? bookingData.total_amount : Math.round(bookingData.total_amount * 1.02)}</strong></p>
                    <small>*2% processing fee ${bookingData.payment_method === 'card' ? 'already' : ''} included</small>
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
    
    // Ensure all required fields are present
    const completeBookingData = {
        customer_name: bookingData.customer_name,
        phone: bookingData.phone,
        email: bookingData.email,
        travel_date: bookingData.travel_date,
        pickup_location: bookingData.pickup_location,
        car_type: bookingData.packages[0].carType,
        packages: bookingData.packages,
        base_amount: bookingData.packages[0].price,
        car_multiplier: (bookingData.packages[0].selectedPrice || bookingData.packages[0].price) / bookingData.packages[0].price,
        total_amount: bookingData.total_amount
    };
    
    console.log('📋 Complete booking data:', completeBookingData);
    
    fetch('/api/travel-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeBookingData)
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
        
        const amount = Math.round(bookingData.total_amount * 100);
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
    
    // Ensure all required fields are present
    const completeBookingData = {
        customer_name: bookingData.customer_name,
        phone: bookingData.phone,
        email: bookingData.email,
        travel_date: bookingData.travel_date,
        pickup_location: bookingData.pickup_location,
        car_type: bookingData.packages[0].carType,
        packages: bookingData.packages,
        base_amount: bookingData.packages[0].price,
        car_multiplier: (bookingData.packages[0].selectedPrice || bookingData.packages[0].price) / bookingData.packages[0].price,
        total_amount: bookingData.total_amount
    };
    
    fetch('/api/travel-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeBookingData)
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

// Close panel when clicking outside
window.onclick = function(event) {
    const paymentModal = document.querySelector('.payment-modal');
    
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

let currentTravelGalleryIndex = 0;
let currentTravelGalleryImages = [];
let currentTravelPackageId = null;

function viewPackageGallery(packageId) {
    const package = travelPackages.find(p => p.id === packageId);
    if (!package) return;
    
    console.log('📸 Gallery Debug - Package:', package);
    console.log('📸 Gallery Debug - Gallery field:', package.gallery);
    
    currentTravelPackageId = packageId;
    currentTravelGalleryImages = [];
    
    // Add main image
    if (package.image) {
        currentTravelGalleryImages.push({type: 'image', url: package.image});
        console.log('📸 Added main image:', package.image);
    }
    
    // Add gallery images
    if (package.gallery && package.gallery.trim()) {
        const additionalImages = package.gallery.split('\n').filter(img => img.trim());
        console.log('📸 Gallery images found:', additionalImages);
        additionalImages.forEach(img => {
            currentTravelGalleryImages.push({type: 'image', url: img.trim()});
        });
    } else {
        console.log('📸 No gallery images found for package', packageId);
    }
    
    console.log('📸 Total images to show:', currentTravelGalleryImages);
    
    if (currentTravelGalleryImages.length === 0) {
        alert('No images available for this package');
        return;
    }
    
    currentTravelGalleryIndex = 0;
    
    // Create gallery modal with proper structure
    const galleryModal = document.createElement('div');
    galleryModal.id = 'travelGalleryModal';
    galleryModal.className = 'travel-gallery-modal';
    galleryModal.innerHTML = `
        <div class="travel-gallery-content">
            <span class="travel-gallery-close" onclick="closeTravelGallery()">&times;</span>
            <h2 id="travelGalleryTitle">${package.name}</h2>
            
            <div class="travel-gallery-main">
                <div class="travel-gallery-images"></div>
            </div>
            
            <div class="travel-gallery-thumbnails" id="travelGalleryThumbnails"></div>
            
            <div id="travelGalleryDescription" class="travel-package-details-modal">
                <h3>Package Details</h3>
                <p><strong>Duration:</strong> ${package.duration}</p>
                <p><strong>Price:</strong> ₹${package.price.toLocaleString()}</p>
                <p><strong>Description:</strong> ${package.description}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(galleryModal);
    document.body.style.overflow = 'hidden';
    
    updateTravelGalleryImage();
    setupTravelGalleryThumbnails();
    
    // Add click outside to close
    galleryModal.addEventListener('click', function(e) {
        if (e.target === galleryModal) {
            closeTravelGallery();
        }
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', handleTravelGalleryKeydown);
}

function handleTravelGalleryKeydown(e) {
    const modal = document.getElementById('travelGalleryModal');
    if (!modal) return;
    
    switch(e.key) {
        case 'Escape':
            closeTravelGallery();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            prevTravelImage();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextTravelImage();
            break;
    }
}

function closeTravelGallery() {
    const galleryModal = document.getElementById('travelGalleryModal');
    if (galleryModal) {
        galleryModal.remove();
        document.body.style.overflow = 'auto';
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleTravelGalleryKeydown);
    }
}

function updateTravelGalleryImage() {
    if (currentTravelGalleryImages.length > 0) {
        const currentItem = currentTravelGalleryImages[currentTravelGalleryIndex];
        const container = document.querySelector('.travel-gallery-images');
        
        if (!container) return;
        
        container.innerHTML = `
            <img id="travelGalleryMainImage" src="${currentItem.url}" alt="" style="max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div class="travel-gallery-controls">
                <button id="travelGalleryPrev" onclick="prevTravelImage()">&lt;</button>
                <button id="travelGalleryNext" onclick="nextTravelImage()">&gt;</button>
            </div>
        `;
    }
}

function setupTravelGalleryThumbnails() {
    const thumbnailsContainer = document.getElementById('travelGalleryThumbnails');
    if (!thumbnailsContainer) return;
    
    thumbnailsContainer.innerHTML = currentTravelGalleryImages.map((item, index) => {
        return `<img src="${item.url}" class="travel-gallery-thumbnail ${index === currentTravelGalleryIndex ? 'active' : ''}" onclick="setTravelGalleryImage(${index})" style="width: 80px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; opacity: ${index === currentTravelGalleryIndex ? '1' : '0.6'}; transition: opacity 0.3s, transform 0.3s; border: 2px solid ${index === currentTravelGalleryIndex ? '#28a745' : 'transparent'};">`;
    }).join('');
}

function setTravelGalleryImage(index) {
    currentTravelGalleryIndex = index;
    updateTravelGalleryImage();
    setupTravelGalleryThumbnails();
}

function nextTravelImage() {
    if (currentTravelGalleryImages.length > 1) {
        currentTravelGalleryIndex = (currentTravelGalleryIndex + 1) % currentTravelGalleryImages.length;
        updateTravelGalleryImage();
        setupTravelGalleryThumbnails();
    }
}

function prevTravelImage() {
    if (currentTravelGalleryImages.length > 1) {
        currentTravelGalleryIndex = currentTravelGalleryIndex === 0 ? currentTravelGalleryImages.length - 1 : currentTravelGalleryIndex - 1;
        updateTravelGalleryImage();
        setupTravelGalleryThumbnails();
    }
}

function toggleDescription(packageId) {
    const shortDesc = document.getElementById(`desc-short-${packageId}`);
    const fullDesc = document.getElementById(`desc-full-${packageId}`);
    const button = event.target;
    
    if (shortDesc.style.display === 'none') {
        shortDesc.style.display = 'block';
        fullDesc.style.display = 'none';
        button.textContent = 'View More';
    } else {
        shortDesc.style.display = 'none';
        fullDesc.style.display = 'block';
        button.textContent = 'View Less';
    }
}

function showCenterNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type} center-notification`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="error-icon">⚠️</div>
            <div class="notification-text">
                <strong>Booking Restriction</strong><br>
                ${message}
            </div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        padding: 2rem;
        border-radius: 15px;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(220, 53, 69, 0.3);
        font-size: 16px;
        max-width: 400px;
        text-align: center;
        animation: errorPulse 0.6s ease-out;
        border: 3px solid #fff;
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not already present
    if (!document.getElementById('error-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'error-animation-styles';
        style.textContent = `
            @keyframes errorPulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            .error-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: shake 0.5s ease-in-out;
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showNotification(message, type = 'info') {
    const isBookingConfirmation = message.includes('submitted for verification') || message.includes('confirmed');
    const notification = document.createElement('div');
    
    // Get icon and colors based on type
    let icon, bgGradient, shadowColor;
    if (type === 'success') {
        icon = isBookingConfirmation ? '🚗' : '✅';
        bgGradient = 'linear-gradient(135deg, #28a745, #20c997)';
        shadowColor = 'rgba(40, 167, 69, 0.3)';
    } else if (type === 'error') {
        icon = '⚠️';
        bgGradient = 'linear-gradient(135deg, #dc3545, #c82333)';
        shadowColor = 'rgba(220, 53, 69, 0.3)';
    } else {
        icon = 'ℹ️';
        bgGradient = 'linear-gradient(135deg, #17a2b8, #138496)';
        shadowColor = 'rgba(23, 162, 184, 0.3)';
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icon}</div>
            <div class="notification-text">
                <strong>${isBookingConfirmation ? 'Travel Booked!' : type === 'error' ? 'Error' : 'Info'}</strong><br>
                ${message}
            </div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${bgGradient};
        color: white;
        padding: 2rem;
        border-radius: 15px;
        z-index: 10000;
        box-shadow: 0 10px 30px ${shadowColor};
        font-size: 16px;
        max-width: 400px;
        text-align: center;
        animation: notificationPulse 0.6s ease-out;
        border: 3px solid #fff;
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not already present
    if (!document.getElementById('notification-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-animation-styles';
        style.textContent = `
            @keyframes notificationPulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            .notification-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: ${type === 'error' ? 'shake 0.5s ease-in-out' : 'bounce 1s infinite alternate'};
            }
            @keyframes bounce {
                0% { transform: translateY(0); }
                100% { transform: translateY(-10px); }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    const duration = isBookingConfirmation ? 8000 : 4000;
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}