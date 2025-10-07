let resorts = [];
let appliedCoupon = null;
let discountAmount = 0;
let coupons = {};

// Define applyCoupon implementation
function applyCouponImpl() {
    const couponCode = document.getElementById('couponCode').value.trim().toUpperCase();
    const messageDiv = document.getElementById('couponMessage');
    
    if (!couponCode) {
        messageDiv.innerHTML = '<span class="coupon-error">Please enter a coupon code</span>';
        return;
    }
    
    if (coupons[couponCode]) {
        const coupon = coupons[couponCode];
        appliedCoupon = couponCode;
        
        // Calculate discount
        const baseAmount = parseInt(document.getElementById('baseAmount').textContent.replace('₹', '').replace(',', ''));
        
        if (coupon.type === 'percentage') {
            discountAmount = Math.round(baseAmount * coupon.discount / 100);
        } else {
            discountAmount = coupon.discount;
        }
        
        // Update UI
        document.getElementById('discountAmount').textContent = `-₹${discountAmount.toLocaleString()}`;
        document.getElementById('discountRow').style.display = 'flex';
        messageDiv.innerHTML = `<span class="coupon-success">Coupon applied! You saved ₹${discountAmount.toLocaleString()}</span>`;
        
        // Update total
        updateTotalPrice();
    } else {
        messageDiv.innerHTML = '<span class="coupon-error">Invalid coupon code</span>';
    }
}

function updateTotalPrice() {
    const baseAmount = parseInt(document.getElementById('baseAmount').textContent.replace('₹', '').replace(',', ''));
    const finalAmount = baseAmount - discountAmount;
    document.getElementById('totalAmount').textContent = `₹${finalAmount.toLocaleString()}`;
}



document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    loadCoupons();
    setupEventListeners();
    setMinDate();
    setupLogoRotation();
    setupWebSocketSync();
    preloadQRCode();
});

async function loadCoupons(checkIn = null) {
    try {
        const url = checkIn ? `/api/coupons?checkIn=${checkIn}` : '/api/coupons';
        const response = await fetch(url);
        const couponList = await response.json();
        coupons = {};
        couponList.forEach(coupon => {
            coupons[coupon.code] = {
                discount: coupon.discount,
                type: coupon.type,
                day_type: coupon.day_type
            };
        });
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

function preloadQRCode() {
    const qrImage = new Image();
    qrImage.src = 'qr-code.png.jpeg';
    console.log('QR code preloaded for faster display');
}

function setupEventListeners() {
    // Navigation - only handle internal anchor links
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
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
        const galleryModal = document.getElementById('galleryModal');
        if (event.target === modal) {
            closeModal();
        }
        if (event.target === galleryModal) {
            closeGallery();
        }
    });

    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);

    // Date change events
    document.getElementById('checkIn').addEventListener('change', calculateTotal);
    document.getElementById('checkOut').addEventListener('change', calculateTotal);
    document.getElementById('guests').addEventListener('change', calculateTotal);
    
    // Coupon button event
    document.getElementById('applyCouponBtn').addEventListener('click', applyCouponImpl);
    
    // Phone number validation
    document.getElementById('phone').addEventListener('input', function(e) {
        let value = e.target.value;
        // Auto-add +91 if not present
        if (value && !value.startsWith('+91')) {
            value = '+91' + value.replace(/\D/g, '').substring(0, 10);
        }
        // Ensure only +91 followed by 10 digits
        if (value.startsWith('+91')) {
            value = '+91' + value.substring(3).replace(/\D/g, '').substring(0, 10);
        }
        e.target.value = value;
    });
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
    grid.innerHTML = resorts.map(resort => {
        let pricingDisplay = `₹${resort.price.toLocaleString()}/night`;
        
        if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
            pricingDisplay = `From ₹${resort.price.toLocaleString()}/night`;
            const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
            const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
            
            if (weekdayPrice || weekendPrice) {
                pricingDisplay += '<br><small>';
                if (weekdayPrice) pricingDisplay += `Weekday: ₹${weekdayPrice.price.toLocaleString()}`;
                if (weekdayPrice && weekendPrice) pricingDisplay += ' | ';
                if (weekendPrice) pricingDisplay += `Weekend: ₹${weekendPrice.price.toLocaleString()}`;
                pricingDisplay += '</small>';
            }
        }
        
        return `
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
                    <p class="resort-price">${pricingDisplay}</p>
                    <p class="resort-description">${resort.description}</p>
                    ${resort.amenities ? `
                        <div class="resort-amenities">
                            <h4>🏨 Amenities:</h4>
                            <div class="amenities-list">
                                ${resort.amenities.split('\n').filter(a => a.trim()).map(amenity => 
                                    `<span class="amenity-tag">${amenity.trim()}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <button class="book-btn" onclick="openBookingModal(${resort.id})">
                        Book Now
                    </button>
                    <div class="resort-footer">
                        <div class="review-stars">
                            <div class="rating-container" data-resort-id="${resort.id}">
                                <span class="star" data-rating="1">☆</span>
                                <span class="star" data-rating="2">☆</span>
                                <span class="star" data-rating="3">☆</span>
                                <span class="star" data-rating="4">☆</span>
                                <span class="star" data-rating="5">☆</span>
                            </div>
                            <span class="review-text">Rate this resort</span>
                        </div>
                        <div class="cancellation-policy">
                            <a href="Booking cancellation_policy.pdf" target="_blank" class="policy-text">Cancellation Policy</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Setup rating functionality after DOM is updated
    setTimeout(setupRatingStars, 100);
}

async function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;

    document.getElementById('resortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    
    // Load blocked dates for this resort
    await loadBlockedDates(resortId);
    
    calculateTotal();
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
}

function calculateTotal() {
    const resortId = parseInt(document.getElementById('resortId').value);
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    if (!checkIn || !checkOut || !resortId) {
        return;
    }
    
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    // Get pricing based on check-in date only
    const checkInDayOfWeek = startDate.getDay();
    let nightlyRate = resort.price;
    
    if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
        // Check if check-in is weekend (Saturday=6, Sunday=0)
        if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
            const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
            if (weekendPrice) nightlyRate = weekendPrice.price;
        } else {
            // Weekday (Monday=1 to Friday=5)
            const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
            if (weekdayPrice) nightlyRate = weekdayPrice.price;
        }
    }
    
    const basePrice = nightlyRate * nights;
    const platformFee = Math.round(basePrice * 0.015); // 1.5% platform fee
    const total = basePrice + platformFee;
    
    document.getElementById('baseAmount').textContent = `₹${total.toLocaleString()}`;
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
    
    // Reset coupon when dates change and reload applicable coupons
    appliedCoupon = null;
    discountAmount = 0;
    document.getElementById('discountRow').style.display = 'none';
    document.getElementById('couponCode').value = '';
    document.getElementById('couponMessage').innerHTML = '';
    
    // Reload coupons based on check-in date
    loadCoupons(checkIn);
}

let pendingBookingData = null;

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
        guests: document.getElementById('guests').value,
        couponCode: appliedCoupon,
        discountAmount: discountAmount
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
    
    // Phone validation
    const phonePattern = /^\+91[0-9]{10}$/;
    if (!phonePattern.test(bookingData.phone)) {
        showNotification('Please enter a valid Indian WhatsApp number (+91 followed by 10 digits)', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(bookingData.email)) {
        showNotification('Please enter a valid working email address', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

    try {
        // Just validate dates and availability, don't create booking yet
        const resort = resorts.find(r => r.id == bookingData.resortId);
        if (!resort) {
            showNotification('Resort not found', 'error');
            return;
        }
        
        // Check availability with server
        const availabilityResponse = await fetch('/api/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resortId: bookingData.resortId,
                checkIn: bookingData.checkIn,
                checkOut: bookingData.checkOut
            })
        });
        
        if (!availabilityResponse.ok) {
            const error = await availabilityResponse.json();
            showNotification(error.error || 'Resort not available for selected dates', 'error');
            return;
        }
        
        // Calculate pricing
        const checkInDate = new Date(bookingData.checkIn);
        const checkOutDate = new Date(bookingData.checkOut);
        const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
        const basePrice = resort.price * nights;
        const platformFee = Math.round(basePrice * 0.015);
        const totalPrice = basePrice + platformFee - discountAmount;
        
        // Store booking data temporarily
        pendingBookingData = {
            ...bookingData,
            resortName: resort.name,
            basePrice,
            platformFee,
            totalPrice,
            bookingReference: `RB${String(Date.now()).slice(-6)}`
        };
        
        showPaymentInterface(pendingBookingData);
        closeModal();
    } catch (error) {
        console.error('Booking validation error:', error);
        showNotification('Validation failed. Please try again.', 'error');
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

let blockedDates = [];

async function loadBlockedDates(resortId) {
    try {
        const response = await fetch(`/api/blocked-dates/${resortId}`);
        blockedDates = await response.json();
        updateDateInputs();
    } catch (error) {
        console.error('Error loading blocked dates:', error);
        blockedDates = [];
    }
}

function updateDateInputs() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    
    // Remove existing event listeners
    checkInInput.removeEventListener('input', validateCheckInDate);
    checkOutInput.removeEventListener('input', validateCheckOutDate);
    
    // Add new event listeners
    checkInInput.addEventListener('input', validateCheckInDate);
    checkOutInput.addEventListener('input', validateCheckOutDate);
}

function validateCheckInDate(e) {
    const selectedDate = e.target.value;
    
    if (blockedDates.includes(selectedDate)) {
        showNotification('This date is blocked by the resort owner. Please choose another date.', 'error');
        e.target.value = '';
        return;
    }
    
    // Update checkout minimum date
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    document.getElementById('checkOut').min = nextDay.toISOString().split('T')[0];
}

function validateCheckOutDate(e) {
    const checkInDate = document.getElementById('checkIn').value;
    const checkOutDate = e.target.value;
    
    if (checkInDate && checkOutDate <= checkInDate) {
        showNotification('Check-out date must be after check-in date', 'error');
        e.target.value = '';
    }
}

function setupLogoRotation() {
    const logo = document.querySelector('.logo-image');
    if (logo) {
        // Click rotation
        logo.addEventListener('click', function() {
            this.classList.add('rotating');
            setTimeout(() => {
                this.classList.remove('rotating');
            }, 600);
        });
        
        // Auto rotation every 15 seconds
        setInterval(() => {
            logo.classList.add('auto-rotate');
            setTimeout(() => {
                logo.classList.remove('auto-rotate');
            }, 1000);
        }, 15000);
    }
}

function setupWebSocketSync() {
    console.log('📡 EventBridge real-time sync enabled');
    
    try {
        const eventSource = new EventSource('/api/events');
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📡 EventBridge event received:', data);
                
                if (data.type === 'resort.added' || data.type === 'resort.updated' || data.type === 'resort.deleted') {
                    console.log('🏨 Resort update detected - refreshing resorts now!');
                    loadResorts();
                }
                
                if (data.type === 'resort.availability.updated') {
                    console.log('📅 Resort availability updated - refreshing resorts');
                    loadResorts();
                }
            } catch (error) {
                console.log('📡 EventBridge ping or invalid data:', event.data);
            }
        };
        
        eventSource.onerror = function(error) {
            console.log('⚠️ EventBridge connection error:', error);
            console.log('EventSource readyState:', eventSource.readyState);
        };
        
        eventSource.onopen = function() {
            console.log('✅ EventBridge connected successfully');
            console.log('EventSource readyState:', eventSource.readyState);
        };
    } catch (error) {
        console.error('EventBridge setup failed:', error);
    }
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
    // Stop current video
    const currentVideo = document.getElementById('currentVideo');
    if (currentVideo) {
        if (currentVideo.tagName === 'VIDEO') {
            currentVideo.pause();
            currentVideo.currentTime = 0;
        } else if (currentVideo.tagName === 'IFRAME') {
            currentVideo.src = currentVideo.src; // Reload iframe to stop
        }
    }
    
    document.getElementById('galleryModal').style.display = 'none';
}

function showBuffering() {
    const spinner = document.getElementById('bufferingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideBuffering() {
    const spinner = document.getElementById('bufferingSpinner');
    if (spinner) spinner.style.display = 'none';
    
    // Show mobile pause button on mobile devices
    if (window.innerWidth <= 768) {
        const pauseBtn = document.getElementById('mobilePauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'block';
    }
}

function toggleVideoPlayback() {
    const video = document.getElementById('currentVideo');
    const pauseBtn = document.getElementById('mobilePauseBtn');
    
    if (video && video.tagName === 'VIDEO') {
        if (video.paused) {
            video.play();
            pauseBtn.innerHTML = '⏸️';
        } else {
            video.pause();
            pauseBtn.innerHTML = '▶️';
        }
    }
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
                videoHtml = videoId ? `<iframe id="currentVideo" src="https://www.youtube.com/embed/${videoId[1]}?enablejsapi=1" frameborder="0" allowfullscreen style="width:100%;height:400px;border-radius:8px;"></iframe>` : '';
            } else if (currentItem.url.includes('.mp4') || currentItem.url.includes('.webm') || currentItem.url.includes('.ogg')) {
                videoHtml = `
                    <div class="video-container" style="position:relative;width:100%;height:400px;">
                        <video id="currentVideo" controls preload="metadata" style="width:100%;height:100%;border-radius:8px;" 
                               onloadstart="this.volume=0.5" 
                               onloadstart="showBuffering()" 
                               oncanplay="hideBuffering()" 
                               onwaiting="showBuffering()" 
                               onplaying="hideBuffering()">
                            <source src="${currentItem.url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div id="bufferingSpinner" class="buffering-spinner" style="display:none;">
                            <div class="spinner"></div>
                            <p>Loading...</p>
                        </div>
                        <button id="mobilePauseBtn" class="mobile-pause-btn" onclick="toggleVideoPlayback()" style="display:none;">⏸️</button>
                    </div>`;
            } else {
                videoHtml = `<div style="width:100%;height:400px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:8px;"><p>Video format not supported</p></div>`;
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
            // Create video thumbnail with proper play icon
            let videoThumb = '';
            if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
                const videoId = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId[1]}/hqdefault.jpg` : '';
                videoThumb = `<div class="gallery-thumbnail video-thumbnail ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})" style="background-image:url('${thumbUrl}');background-size:cover;background-position:center;position:relative;"><div class="play-overlay">▶</div></div>`;
            } else {
                videoThumb = `<div class="gallery-thumbnail video-thumb ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})" style="background:#333;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;position:relative;"><div class="play-overlay">▶</div></div>`;
            }
            return videoThumb;
        }
    }).join('');
}

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
    currentBookingId = booking.id;
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
            
            <div class="payment-methods">
                <div class="payment-tabs">
                    <button class="payment-tab active" onclick="showPaymentMethod('upi')">🔗 UPI Payment</button>
                    <button class="payment-tab" onclick="showPaymentMethod('card')">💳 Card Payment</button>
                </div>
                
                <div id="upi-payment" class="payment-method active">
                    <div class="qr-section">
                        <img src="qr-code.png.jpeg" alt="UPI QR Code" class="qr-code">
                        <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                        <p><strong>Amount:</strong> ₹${(booking.totalPrice || 0).toLocaleString()}</p>
                    </div>
                    
                    <div class="payment-instructions">
                        <p>• Scan QR code or use UPI ID</p>
                        <p>• Pay exact amount</p>
                        <p>• Enter 12-digit UTR number below</p>
                    </div>
                    
                    <div class="payment-proof">
                        <input type="text" id="transactionId" placeholder="Enter 12-digit UTR number" maxlength="12" pattern="[0-9]{12}" required>
                        <button onclick="confirmPayment()" class="confirm-payment-btn">
                            ✅ Confirm UPI Payment
                        </button>
                    </div>
                </div>
                
                <div id="card-payment" class="payment-method">
                    <div class="card-section">
                        <div class="card-pricing">
                            <p><strong>Base Amount:</strong> ₹${(booking.totalPrice || 0).toLocaleString()}</p>
                            <p><strong>Transaction Fee (1.5%):</strong> ₹${Math.round((booking.totalPrice || 0) * 0.015).toLocaleString()}</p>
                            <p style="font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;">
                                <strong>Total Card Payment:</strong> ₹${((booking.totalPrice || 0) + Math.round((booking.totalPrice || 0) * 0.015)).toLocaleString()}
                            </p>
                        </div>
                        <p>Pay securely with Debit/Credit Card</p>
                        <button onclick="payWithRazorpay(${booking.id}, ${(booking.totalPrice || 0) + Math.round((booking.totalPrice || 0) * 0.015)}, '${booking.guestName}', '${booking.email}', '${booking.phone}')" class="razorpay-btn">
                            💳 Pay ₹${((booking.totalPrice || 0) + Math.round((booking.totalPrice || 0) * 0.015)).toLocaleString()} with Card
                        </button>
                    </div>
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

let currentBookingId = null;

function closePaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        modal.remove();
        pendingBookingData = null;
    }
}

function cancelPayment() {
    if (confirm('Are you sure you want to cancel this payment?')) {
        closePaymentModal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNotification('Payment cancelled. No booking was created.', 'error');
    }
}

async function cancelBooking(bookingId) {
    try {
        await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to cancel booking:', error);
    }
}

async function confirmPayment() {
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
        // Now create the booking with payment info
        const bookingResponse = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...pendingBookingData,
                transactionId
            })
        });
        
        if (bookingResponse.ok) {
            showNotification('Your booking payment is being verified. You will be notified through email and WhatsApp.', 'success');
            closePaymentModal();
            pendingBookingData = null;
        } else {
            const error = await bookingResponse.json();
            showNotification(error.error || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking creation error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function showPaymentMethod(method) {
    // Hide all payment methods
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.payment-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected method
    document.getElementById(`${method}-payment`).classList.add('active');
    event.target.classList.add('active');
}

async function payWithRazorpay(bookingId, amount, name, email, phone) {
    try {
        // Check card payment limit before proceeding
        const limitResponse = await fetch('/api/check-card-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        });
        
        if (!limitResponse.ok) {
            const error = await limitResponse.json();
            showNotification(error.error, 'error');
            return;
        }
        
        // Get Razorpay key from server
        const keyResponse = await fetch('/api/razorpay-key');
        const { key } = await keyResponse.json();
        
        const options = {
            key: key,
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            name: 'Vizag Resorts',
            description: 'Resort Booking Payment',
            handler: function(response) {
                // Payment successful, notify admin immediately
                notifyCardPaymentSuccess(bookingId, response.razorpay_payment_id);
                showCardConfirmation(bookingId, response.razorpay_payment_id);
            },
            prefill: {
                name: name,
                email: email,
                contact: phone
            },
            theme: {
                color: '#667eea'
            },
            method: {
                upi: false,
                wallet: false,
                netbanking: false,
                card: true
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        showNotification('Payment system error. Please try UPI payment.', 'error');
    }
}

async function notifyCardPaymentSuccess(bookingId, paymentId) {
    try {
        // Notify admin immediately about card payment success
        await fetch(`/api/bookings/${bookingId}/notify-card-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
        });
    } catch (error) {
        console.error('Failed to notify card payment:', error);
    }
}

function showCardConfirmation(bookingId, paymentId) {
    // Close Razorpay modal first
    closePaymentModal();
    
    // Show card confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.className = 'payment-modal';
    confirmModal.innerHTML = `
        <div class="payment-content">
            <h2>💳 Confirm Card Payment</h2>
            <div class="card-confirmation">
                <div class="success-message">
                    <p>✅ <strong>Payment Successful!</strong></p>
                    <p>Payment ID: <code>${paymentId}</code></p>
                </div>
                
                <div class="confirmation-step">
                    <h4>Final Step: Verify Your Card</h4>
                    <p>Enter the last 4 digits of the card you used for payment:</p>
                    
                    <div class="card-input-group">
                        <span class="card-prefix">****</span>
                        <input type="text" id="cardLastFour" placeholder="1234" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" required>
                    </div>
                    
                    <button onclick="confirmCardPayment('${bookingId}', '${paymentId}')" class="confirm-payment-btn">
                        ✅ Confirm Booking
                    </button>
                </div>
            </div>
            
            <div class="payment-actions">
                <button onclick="closeCardConfirmation()" class="close-payment-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Auto-focus on input and add validation
    const input = document.getElementById('cardLastFour');
    input.focus();
    
    // Only allow numbers
    input.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    
    // Submit on Enter key
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.value.length === 4) {
            confirmCardPayment(bookingId, paymentId);
        }
    });
}

function closeCardConfirmation() {
    const modal = document.querySelector('.payment-modal');
    if (modal) modal.remove();
}

async function confirmCardPayment(bookingId, paymentId) {
    const cardLastFour = document.getElementById('cardLastFour').value;
    const submitBtn = document.querySelector('.confirm-payment-btn');
    
    // Validation
    if (!cardLastFour) {
        showNotification('Please enter the last 4 digits of your card', 'error');
        document.getElementById('cardLastFour').focus();
        return;
    }
    
    if (!/^[0-9]{4}$/.test(cardLastFour)) {
        showNotification('Please enter exactly 4 digits', 'error');
        document.getElementById('cardLastFour').focus();
        return;
    }
    
    // Disable button during submission
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Confirming...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/card-payment-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, cardLastFour })
        });
        
        if (response.ok) {
            showNotification('Card payment submitted for verification. You will be notified through email and WhatsApp.', 'success');
            closeCardConfirmation();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Payment confirmation failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Longer duration for success messages, especially payment confirmations
    const duration = type === 'success' ? 8000 : 5000;
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Rating functionality
function setupRatingStars() {
    document.querySelectorAll('.rating-container').forEach(container => {
        const stars = container.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                highlightStars(stars, index + 1);
            });
            
            star.addEventListener('mouseleave', () => {
                const rating = container.dataset.userRating || 0;
                highlightStars(stars, rating);
            });
            
            star.addEventListener('click', () => {
                const rating = index + 1;
                container.dataset.userRating = rating;
                highlightStars(stars, rating);
                showNotification(`You rated this resort ${rating} star${rating > 1 ? 's' : ''}!`, 'success');
            });
        });
    });
}

function highlightStars(stars, rating) {
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
    });
}