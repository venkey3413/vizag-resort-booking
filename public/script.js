let resorts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
    setupLogoRotation();
    setupWebSocketSync();
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
        });
    });

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('bookingModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);

    // Date change events
    document.getElementById('checkIn').addEventListener('change', calculateTotal);
    document.getElementById('checkOut').addEventListener('change', calculateTotal);
    document.getElementById('guests').addEventListener('change', calculateTotal);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
        showNotification('Failed to load resorts', 'error');
    }
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <img src="${resort.image}" alt="${resort.name}" class="resort-image">
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location">
                    📍 ${resort.location}
                    ${resort.map_link ? `<br><a href="${resort.map_link}" target="_blank" class="view-map-btn">🗺️ View Map</a>` : ''}
                </p>
                <p class="resort-price">₹${resort.price.toLocaleString()}/night</p>
                <p class="resort-description">${resort.description}</p>
                <button class="book-btn" onclick="openBookingModal(${resort.id})">
                    Book Now
                </button>
            </div>
        </div>
    `).join('');
}



function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;

    document.getElementById('resortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    
    calculateTotal();
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
}

function calculateTotal() {
    const price = parseInt(document.getElementById('resortPrice').value) || 0;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    let nights = 1;
    if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        nights = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }
    
    const total = price * nights;
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
}

async function handleBooking(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const bookingData = {
        resortId: document.getElementById('resortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        guests: document.getElementById('guests').value
    };

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            const booking = await response.json();
            showPaymentInterface(booking);
            closeModal();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('checkIn').min = today;
    document.getElementById('checkIn').value = today;
    document.getElementById('checkOut').min = tomorrowStr;
    document.getElementById('checkOut').value = tomorrowStr;
}

function setupLogoRotation() {
    const logo = document.querySelector('.logo-image');
    if (logo) {
        logo.addEventListener('click', function() {
            this.classList.add('rotating');
            setTimeout(() => {
                this.classList.remove('rotating');
            }, 600);
        });
    }
}

function setupWebSocketSync() {
    const socket = io(`http://${window.location.hostname}:3003`);
    
    socket.on('connect', () => {
        console.log('🔌 Connected to real-time sync');
    });
    
    socket.on('refresh', (data) => {
        console.log('🔄 Data updated, refreshing...');
        loadResorts();
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from sync');
    });
}



function showPaymentInterface(booking) {
    const paymentModal = document.createElement('div');
    paymentModal.className = 'payment-modal';
    paymentModal.innerHTML = `
        <div class="payment-content">
            <h2>💳 Complete Payment</h2>
            <div class="booking-summary">
                <h3>Booking Details</h3>
                <p><strong>Resort:</strong> ${booking.resortName}</p>
                <p><strong>Guest:</strong> ${booking.guestName}</p>
                <p><strong>Amount:</strong> ₹${booking.totalPrice.toLocaleString()}</p>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
            </div>
            
            <div class="upi-payment">
                <h3>🔗 UPI Payment</h3>
                <div class="qr-section">
                    <img src="${booking.paymentDetails.qrCodeUrl}" alt="UPI QR Code" class="qr-code">
                    <p><strong>UPI ID:</strong> ${booking.paymentDetails.upiId}</p>
                </div>
                
                <div class="payment-instructions">
                    ${booking.paymentDetails.instructions.map(instruction => `<p>• ${instruction}</p>`).join('')}
                </div>
                
                <div class="payment-proof">
                    <h4>Upload Payment Proof</h4>
                    <input type="text" id="transactionId" placeholder="Enter UPI Transaction ID" required>
                    <button onclick="confirmPayment(${booking.id})" class="confirm-payment-btn">
                        ✅ Confirm Payment
                    </button>
                </div>
            </div>
            
            <button onclick="closePaymentModal()" class="close-payment-btn">Close</button>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
}

function closePaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        modal.remove();
    }
}

async function confirmPayment(bookingId) {
    const transactionId = document.getElementById('transactionId').value;
    
    if (!transactionId) {
        showNotification('Please enter transaction ID', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/payment-proof`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactionId })
        });
        
        if (response.ok) {
            showNotification('Payment confirmed! Booking is now confirmed.', 'success');
            closePaymentModal();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Payment confirmation failed', 'error');
        }
    } catch (error) {
        console.error('Payment confirmation error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}