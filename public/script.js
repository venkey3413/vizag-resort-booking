let resorts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
    setupLogoRotation();
    setupWebSocketSync();
    preloadQRCode();
});

function preloadQRCode() {
    const qrImage = new Image();
    qrImage.src = 'qr-code.png.jpeg';
    console.log('QR code preloaded for faster display');
}

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
            <div class="resort-gallery">
                <img src="${resort.image}" alt="${resort.name}" class="resort-image main-image">
                ${(resort.gallery || resort.videos) ? `
                    <button class="view-more-btn" onclick="openGallery(${resort.id})">
                        📸 View More
                    </button>
                ` : ''}
            </div>
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
                <div class="resort-footer">
                    <div class="review-stars">
                        <span class="stars">★★★★☆</span>
                        <span class="review-text">4.2 (128 reviews)</span>
                    </div>
                    <div class="cancellation-policy">
                        <span class="policy-text">Free cancellation up to 24hrs</span>
                    </div>
                </div>
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
    
    const basePrice = price * nights;
    const platformFee = Math.round(basePrice * 0.015); // 1.5% platform fee
    const total = basePrice + platformFee;
    
    document.getElementById('totalAmount').innerHTML = `
        <div>Base Price: ₹${basePrice.toLocaleString()}</div>
        <div>Platform Fee (1.5%): ₹${platformFee.toLocaleString()}</div>
        <div style="font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;">
            Total: ₹${total.toLocaleString()}
        </div>
    `;
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
    
    // Date validation
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
        showNotification('Check-in date cannot be in the past', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    if (checkOutDate <= checkInDate) {
        showNotification('Check-out date must be at least one day after check-in date', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

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
    console.log('🔄 EventBridge real-time sync enabled');
    
    // Check for updates every 3 seconds (EventBridge triggers are near real-time)
    setInterval(async () => {
        try {
            const response = await fetch('/api/resorts');
            const newResorts = await response.json();
            
            if (JSON.stringify(newResorts) !== JSON.stringify(resorts)) {
                console.log('🔄 EventBridge update detected, refreshing...');
                resorts = newResorts;
                displayResorts();
            }
        } catch (error) {
            // Silent error handling
        }
    }, 3000);
}

let currentGalleryIndex = 0;
let currentGalleryImages = [];
let currentResortId = null;

function openGallery(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    currentResortId = resortId;
    currentGalleryImages = [];
    
    // Add main image
    if (resort.image) {
        currentGalleryImages.push({type: 'image', url: resort.image});
    }
    
    // Add gallery images
    if (resort.gallery) {
        const additionalImages = resort.gallery.split('\n').filter(img => img.trim());
        additionalImages.forEach(img => {
            currentGalleryImages.push({type: 'image', url: img});
        });
    }
    
    // Add videos
    if (resort.videos) {
        const videoUrls = resort.videos.split('\n').filter(url => url.trim());
        videoUrls.forEach(video => {
            currentGalleryImages.push({type: 'video', url: video});
        });
    }
    
    currentGalleryIndex = 0;
    
    document.getElementById('galleryTitle').textContent = resort.name;
    document.getElementById('galleryDescription').innerHTML = `
        <p><strong>Location:</strong> ${resort.location}</p>
        <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
        <p>${resort.description}</p>
    `;
    
    updateGalleryImage();
    setupGalleryThumbnails();
    
    document.getElementById('galleryModal').style.display = 'block';
}

function closeGallery() {
    document.getElementById('galleryModal').style.display = 'none';
}

function updateGalleryImage() {
    if (currentGalleryImages.length > 0) {
        const currentItem = currentGalleryImages[currentGalleryIndex];
        const container = document.querySelector('.gallery-images');
        
        if (currentItem.type === 'image') {
            container.innerHTML = `
                <img id="galleryMainImage" src="${currentItem.url}" alt="">
                <div class="gallery-controls">
                    <button id="galleryPrev">&lt;</button>
                    <button id="galleryNext">&gt;</button>
                </div>
            `;
        } else if (currentItem.type === 'video') {
            let videoHtml = '';
            if (currentItem.url.includes('youtube.com') || currentItem.url.includes('youtu.be')) {
                const videoId = currentItem.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                videoHtml = videoId ? `<iframe src="https://www.youtube.com/embed/${videoId[1]}" frameborder="0" allowfullscreen style="width:100%;height:400px;"></iframe>` : '';
            } else {
                videoHtml = `<video controls style="width:100%;height:400px;"><source src="${currentItem.url}" type="video/mp4"></video>`;
            }
            
            container.innerHTML = `
                ${videoHtml}
                <div class="gallery-controls">
                    <button id="galleryPrev">&lt;</button>
                    <button id="galleryNext">&gt;</button>
                </div>
            `;
        }
        
        // Re-attach event listeners
        document.getElementById('galleryPrev').onclick = () => prevImage(currentResortId);
        document.getElementById('galleryNext').onclick = () => nextImage(currentResortId);
    }
}

function setupGalleryThumbnails() {
    const thumbnailsContainer = document.getElementById('galleryThumbnails');
    thumbnailsContainer.innerHTML = currentGalleryImages.map((item, index) => {
        if (item.type === 'image') {
            return `<img src="${item.url}" class="gallery-thumbnail ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})">`;
        } else {
            return `<div class="gallery-thumbnail video-thumb ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})">🎥</div>`;
        }
    }).join('');
}

// Remove separate video section - videos now in slideshow

function setGalleryImage(index) {
    currentGalleryIndex = index;
    updateGalleryImage();
    setupGalleryThumbnails();
}

function nextImage(resortId) {
    if (currentGalleryImages.length > 1) {
        currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
        updateGalleryImage();
        setupGalleryThumbnails();
    }
}

function prevImage(resortId) {
    if (currentGalleryImages.length > 1) {
        currentGalleryIndex = currentGalleryIndex === 0 ? currentGalleryImages.length - 1 : currentGalleryIndex - 1;
        updateGalleryImage();
        setupGalleryThumbnails();
    }
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
                <p><strong>Base Price:</strong> ₹${(booking.basePrice || booking.totalPrice || 0).toLocaleString()}</p>
                <p><strong>Platform Fee (1.5%):</strong> ₹${(booking.platformFee || Math.round((booking.totalPrice || 0) * 0.015)).toLocaleString()}</p>
                <p><strong>Total Amount:</strong> ₹${(booking.totalPrice || 0).toLocaleString()}</p>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
            </div>
            
            <div class="upi-payment">
                <h3>🔗 UPI Payment</h3>
                <div class="qr-section">
                    <img src="qr-code.png.jpeg" alt="UPI QR Code" class="qr-code" onload="console.log('QR loaded')" onerror="console.error('QR failed to load')">
                    <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                    <p><strong>Amount:</strong> ₹${(booking.totalPrice || 0).toLocaleString()}</p>
                </div>
                
                <div class="payment-instructions">
                    ${(booking.paymentDetails?.instructions || ['1. Scan QR code', '2. Pay amount', '3. Enter transaction ID']).map(instruction => `<p>• ${instruction}</p>`).join('')}
                </div>
                
                <div class="payment-proof">
                    <h4>Upload Payment Proof</h4>
                    <input type="text" id="transactionId" placeholder="Please enter your 12-digit transaction ID" maxlength="12" pattern="[0-9]{12}" required>
                    <button onclick="confirmPayment(${booking.id})" class="confirm-payment-btn">
                        ✅ Confirm Payment
                    </button>
                </div>
            </div>
            
            <div class="payment-actions">
                <button onclick="cancelPayment()" class="cancel-payment-btn">Cancel Payment</button>
                <button onclick="closePaymentModal()" class="close-payment-btn">Close</button>
            </div>
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

function cancelPayment() {
    if (confirm('Are you sure you want to cancel this payment? You will return to the main page.')) {
        closePaymentModal();
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNotification('Payment cancelled. You can try booking again.', 'error');
    }
}

async function confirmPayment(bookingId) {
    const transactionId = document.getElementById('transactionId').value;
    
    if (!transactionId) {
        showNotification('Please enter your 12-digit transaction ID', 'error');
        return;
    }
    
    if (!/^[0-9]{12}$/.test(transactionId)) {
        showNotification('Transaction ID must be exactly 12 digits', 'error');
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
            showNotification('Your booking payment is being verified. You will be notified through email.', 'success');
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