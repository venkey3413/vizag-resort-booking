let resorts = [];
let socket;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
    initializeSocket();
});

function initializeSocket() {
    try {
        if (typeof io !== 'undefined') {
            socket = io();
            
            socket.on('resortAdded', (resort) => {
                resorts.unshift(resort);
                displayResorts();
                populateLocationFilter();
            });
            
            socket.on('resortUpdated', (updatedResort) => {
                const index = resorts.findIndex(r => r.id === updatedResort.id);
                if (index !== -1) {
                    resorts[index] = { ...resorts[index], ...updatedResort };
                    displayResorts();
                    populateLocationFilter();
                }
            });
            
            socket.on('resortDeleted', (data) => {
                resorts = resorts.filter(r => r.id !== data.id);
                displayResorts();
                populateLocationFilter();
            });
            
            socket.on('resortAvailabilityUpdated', (data) => {
                const resort = resorts.find(r => r.id === data.id);
                if (resort) {
                    resort.available = data.available;
                    displayResorts();
                }
            });
        }
    } catch (error) {
        console.log('Socket.IO not available, continuing without real-time updates');
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
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
        populateLocationFilter();
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

function displayResorts(filteredResorts = resorts) {
    const grid = document.getElementById('resortsGrid');
    
    if (filteredResorts.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: white; font-size: 1.2rem;">No resorts found.</p>';
        return;
    }
    
    grid.innerHTML = filteredResorts.map(resort => `
        <div class="resort-card" data-resort-id="${resort.id}">
            <div class="image-gallery">
                <div class="image-slider" onclick="openResortDetails(${resort.id})">
                    ${(() => {
                        if (resort.images && resort.images.length > 0) {
                            return resort.images.map((media, index) => {
                                const isVideo = media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov') || media.toLowerCase().includes('.avi') || media.toLowerCase().includes('.webm');
                                if (isVideo) {
                                    return `<video src="${media}" class="resort-image ${index === 0 ? 'active' : ''}" data-resort="${resort.id}" data-index="${index}" controls muted loop preload="metadata"></video>`;
                                } else {
                                    return `<img src="${media}" alt="${resort.name}" class="resort-image ${index === 0 ? 'active' : ''}" data-resort="${resort.id}" data-index="${index}">`;
                                }
                            }).join('');
                        }
                        return '<img src="data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 400 200\\"><rect fill=\\"%23ecf0f1\\" width=\\"400\\" height=\\"200\\"/><text x=\\"200\\" y=\\"100\\" text-anchor=\\"middle\\" fill=\\"%237f8c8d\\" font-size=\\"16\\">No Media</text></svg>" alt="${resort.name}" class="resort-image active">';
                    })()}
                </div>
                ${resort.images && resort.images.length > 1 ? `
                    <button class="image-navigation prev-nav" onclick="changeCardImage(${resort.id}, -1, event)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="image-navigation next-nav" onclick="changeCardImage(${resort.id}, 1, event)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="image-dots">
                        ${resort.images.map((_, index) => 
                            `<span class="dot ${index === 0 ? 'active' : ''}" onclick="setCardImage(${resort.id}, ${index}, event)"></span>`
                        ).join('')}
                    </div>
                    <div class="image-count">${resort.images.length} media</div>
                ` : ''}
            </div>
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location"><i class="fas fa-map-marker-alt"></i> ${resort.location}</p>
                <p class="resort-price">₹${resort.price.toLocaleString()}/night</p>
                <p class="resort-description">${resort.description}</p>
                <div class="amenities">
                    ${resort.amenities.map(amenity => `<span class="amenity">${amenity}</span>`).join('')}
                </div>
                ${resort.available ? 
                    `<button class="book-btn" onclick="openBookingModal(${resort.id})">
                        <i class="fas fa-calendar-check"></i> Book Now
                    </button>
                    <div class="policy-link">
                        <a href="Booking cancellation_policy.pdf" target="_blank" class="pdf-link">
                            <i class="fas fa-file-pdf"></i> Cancellation Policy
                        </a>
                    </div>` : 
                    `<button class="book-btn unavailable" disabled>
                        <i class="fas fa-times-circle"></i> Currently Unavailable
                    </button>`
                }
            </div>
        </div>
    `).join('');
}

// Inline image browsing functions
function changeCardImage(resortId, direction, event) {
    event.stopPropagation();
    const card = document.querySelector(`[data-resort-id="${resortId}"]`);
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    let currentIndex = 0;
    images.forEach((img, index) => {
        if (img.classList.contains('active')) {
            currentIndex = index;
        }
        img.classList.remove('active');
    });
    
    dots.forEach(dot => dot.classList.remove('active'));
    
    currentIndex += direction;
    if (currentIndex >= images.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = images.length - 1;
    
    images[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
}

function setCardImage(resortId, index, event) {
    event.stopPropagation();
    const card = document.querySelector(`[data-resort-id="${resortId}"]`);
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    images.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    images[index].classList.add('active');
    dots[index].classList.add('active');
}

function populateLocationFilter() {
    const filter = document.getElementById('locationFilter');
    const locations = [...new Set(resorts.map(resort => resort.location))];
    
    filter.innerHTML = '<option value="">All Locations</option>' + 
        locations.map(location => `<option value="${location}">${location}</option>`).join('');
}

function filterResorts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value;
    
    const filtered = resorts.filter(resort => {
        const matchesSearch = resort.name.toLowerCase().includes(searchTerm) || 
                            resort.location.toLowerCase().includes(searchTerm) ||
                            resort.description.toLowerCase().includes(searchTerm);
        const matchesLocation = !locationFilter || resort.location === locationFilter;
        
        return matchesSearch && matchesLocation;
    });
    
    displayResorts(filtered);
}

function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const modal = document.getElementById('bookingModal');
    document.getElementById('bookingResortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    document.getElementById('pricePerNight').textContent = `₹${resort.price.toLocaleString()}`;
    
    const guestsInput = document.getElementById('guests');
    const maxGuests = resort.max_guests || 20;
    guestsInput.max = maxGuests;
    document.getElementById('maxGuestsCount').textContent = maxGuests;
    
    calculateTotal();
    modal.style.display = 'block';
}

function calculateTotal() {
    const resortId = parseInt(document.getElementById('bookingResortId').value);
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const basePrice = resort.price;
    const guests = parseInt(document.getElementById('guests').value) || 1;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    let nights = 1;
    if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const timeDiff = endDate.getTime() - startDate.getTime();
        nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    }
    
    const bookingAmount = basePrice * nights;
    const platformFee = Math.round(bookingAmount * 0.015); // 1.5% platform fee
    const total = bookingAmount + platformFee;
    
    document.getElementById('pricePerNight').textContent = `₹${basePrice.toLocaleString()} per night`;
    document.getElementById('bookingAmount').textContent = `₹${bookingAmount.toLocaleString()}`;
    document.getElementById('platformFee').textContent = `₹${platformFee.toLocaleString()}`;
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
    document.getElementById('totalAmount').textContent = '₹0';
}

async function handleBooking(e) {
    e.preventDefault();
    
    const phoneInput = document.getElementById('phone').value;
    
    // Validate phone number
    if (!/^[0-9]{10}$/.test(phoneInput)) {
        showNotification('Please enter a valid 10-digit mobile number', 'error');
        return;
    }
    
    const bookingData = {
        resortId: document.getElementById('bookingResortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: '+91' + phoneInput,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        guests: document.getElementById('guests').value
    };
    
    // Get total amount
    const totalAmountText = document.getElementById('totalAmount').textContent;
    const totalAmount = parseInt(totalAmountText.replace(/[^0-9]/g, ''));
    
    try {
        // Create payment order
        const orderResponse = await fetch('/api/payment/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: totalAmount,
                bookingData: bookingData
            })
        });
        
        if (!orderResponse.ok) {
            const error = await orderResponse.json();
            showNotification('Payment setup failed: ' + error.error, 'error');
            return;
        }
        
        const orderData = await orderResponse.json();
        
        // Initialize Razorpay payment
        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Vizag Resort Booking',
            description: `Booking for ${bookingData.guestName}`,
            order_id: orderData.orderId,
            handler: async function(response) {
                await verifyPaymentAndBook(response, bookingData);
            },
            prefill: {
                name: bookingData.guestName,
                email: bookingData.email,
                contact: bookingData.phone
            },
            theme: {
                color: '#2c3e50'
            },
            modal: {
                ondismiss: function() {
                    showNotification('Payment cancelled', 'error');
                }
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Payment setup failed. Please try again.', 'error');
    }
}

async function verifyPaymentAndBook(paymentResponse, bookingData) {
    try {
        const verifyResponse = await fetch('/api/payment/verify-and-book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentId: paymentResponse.razorpay_payment_id,
                orderId: paymentResponse.razorpay_order_id,
                signature: paymentResponse.razorpay_signature,
                bookingData: bookingData
            })
        });
        
        const result = await verifyResponse.json();
        
        if (result.success) {
            showNotification(`🎉 PAYMENT SUCCESSFUL!\n\nBooking ID: RB${String(result.booking.id).padStart(4, '0')}\nUTR: ${result.utrNumber}\nAmount: ₹${result.booking.totalPrice.toLocaleString()}\n\nBooking confirmed!`, 'success');
            closeModal();
            document.getElementById('bookingForm').reset();
        } else {
            showNotification('Payment verification failed: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        showNotification('Payment verification failed. Please contact support.', 'error');
    }
}

// Custom notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            .notification.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .notification.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .notification.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            .notification-content { display: flex; justify-content: space-between; align-items: flex-start; }
            .notification-message { flex: 1; white-space: pre-line; }
            .notification-close { background: none; border: none; font-size: 20px; cursor: pointer; margin-left: 10px; }
            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function setMinDate() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Set default check-in time to 11:00 AM today
    const checkInDefault = `${todayStr}T11:00`;
    document.getElementById('checkIn').value = checkInDefault;
    document.getElementById('checkIn').min = checkInDefault;
    
    // Set default check-out time to 9:00 AM next day
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const checkOutDefault = `${tomorrowStr}T09:00`;
    document.getElementById('checkOut').value = checkOutDefault;
    document.getElementById('checkOut').min = checkOutDefault;
    
    document.getElementById('checkIn').addEventListener('change', function() {
        const checkInDate = new Date(this.value);
        const nextDay = new Date(checkInDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const minCheckOut = `${nextDay.toISOString().split('T')[0]}T09:00`;
        document.getElementById('checkOut').min = minCheckOut;
        if (new Date(document.getElementById('checkOut').value) <= checkInDate) {
            document.getElementById('checkOut').value = minCheckOut;
        }
    });
    
    // Phone number validation
    document.getElementById('phone').addEventListener('input', function(e) {
        // Only allow numbers
        this.value = this.value.replace(/[^0-9]/g, '');
        // Limit to 10 digits
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });
}

let currentResortImages = [];
let currentImageIndex = 0;

function openResortDetails(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    currentResortImages = [];
    if (resort.images && Array.isArray(resort.images) && resort.images.length > 0) {
        currentResortImages = resort.images;
    } else {
        currentResortImages = ['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="%23ecf0f1" width="400" height="200"/><text x="200" y="100" text-anchor="middle" fill="%237f8c8d" font-size="16">No Image Available</text></svg>'];
    }
    
    currentImageIndex = 0;
    updateMainImage();
    
    const thumbnailContainer = document.getElementById('thumbnailImages');
    thumbnailContainer.innerHTML = currentResortImages.map((media, index) => {
        const isVideo = media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov') || media.toLowerCase().includes('.avi') || media.toLowerCase().includes('.webm');
        if (isVideo) {
            return `<video src="${media}" class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(${index})" muted preload="metadata"></video>`;
        } else {
            return `<img src="${media}" alt="${resort.name}" class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(${index})">`;
        }
    }).join('');
    
    document.getElementById('totalImages').textContent = currentResortImages.length;
    document.getElementById('detailsResortName').textContent = resort.name;
    document.getElementById('detailsLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${resort.location}`;
    document.getElementById('detailsPrice').textContent = `₹${resort.price.toLocaleString()}/night`;
    document.getElementById('detailsDescription').textContent = resort.description;
    document.getElementById('detailsAmenities').innerHTML = resort.amenities.map(amenity => 
        `<span class="amenity">${amenity}</span>`
    ).join('');
    
    document.getElementById('detailsBookBtn').onclick = () => {
        closeResortDetails();
        openBookingModal(resortId);
    };
    
    document.getElementById('resortDetailsModal').style.display = 'block';
}

function updateMainImage() {
    const mainElement = document.getElementById('mainResortImage');
    const currentMedia = currentResortImages[currentImageIndex];
    const isVideo = currentMedia.toLowerCase().includes('.mp4') || currentMedia.toLowerCase().includes('.mov') || currentMedia.toLowerCase().includes('.avi') || currentMedia.toLowerCase().includes('.webm');
    
    if (isVideo) {
        mainElement.outerHTML = `<video id="mainResortImage" src="${currentMedia}" class="main-resort-image" controls muted loop preload="metadata"></video>`;
    } else {
        mainElement.outerHTML = `<img id="mainResortImage" src="${currentMedia}" alt="" class="main-resort-image">`;
    }
    
    document.getElementById('currentImageIndex').textContent = currentImageIndex + 1;
    
    document.querySelectorAll('.thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentImageIndex);
    });
}

function changeMainImage(index) {
    currentImageIndex = index;
    updateMainImage();
}

function previousImage() {
    currentImageIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentResortImages.length - 1;
    updateMainImage();
}

function nextImage() {
    currentImageIndex = currentImageIndex < currentResortImages.length - 1 ? currentImageIndex + 1 : 0;
    updateMainImage();
}

function closeResortDetails() {
    document.getElementById('resortDetailsModal').style.display = 'none';
}

function openBookingFromDetails() {
    const resortId = parseInt(document.getElementById('detailsBookBtn').getAttribute('data-resort-id'));
    closeResortDetails();
    openBookingModal(resortId);
}

// Logo rotation function
function rotateLogo() {
    const logo = document.querySelector('.brand-logo');
    logo.classList.add('rotating');
    
    setTimeout(() => {
        logo.classList.remove('rotating');
    }, 600);
}

window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    const detailsModal = document.getElementById('resortDetailsModal');
    
    if (event.target === bookingModal) {
        bookingModal.style.display = 'none';
    }
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
}

// Load Razorpay script
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

// Initialize Razorpay on page load
document.addEventListener('DOMContentLoaded', function() {
    loadRazorpayScript().then(loaded => {
        if (!loaded) {
            console.error('Failed to load Razorpay script');
        }
    });
});