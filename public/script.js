let resorts = [];
let appliedCoupon = null;
let discountAmount = 0;
let coupons = {};

const SERVER_URL = '';

// Define applyCoupon implementation
function applyCouponImpl() {
    const couponCode = document.getElementById('couponCode').value.trim().toUpperCase();
    const messageDiv = document.getElementById('couponMessage');
    const checkIn = document.getElementById('checkIn').value;
    
    if (!couponCode) {
        messageDiv.innerHTML = '<span class="coupon-error">Please enter a coupon code</span>';
        return;
    }
    
    if (!checkIn) {
        messageDiv.innerHTML = '<span class="coupon-error">Please select check-in date first</span>';
        return;
    }
    
    if (coupons[couponCode]) {
        const coupon = coupons[couponCode];
        
        // Validate coupon for selected date
        const checkInDate = new Date(checkIn);
        const dayOfWeek = checkInDate.getDay();
        // Mon-Thu = weekdays (1,2,3,4), Fri-Sun = weekends (5,6,0)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const dayType = isWeekend ? 'weekend' : 'weekday';
        
        // Check if coupon is valid for this day type
        if (coupon.day_type !== 'all' && coupon.day_type !== dayType) {
            const validDays = coupon.day_type === 'weekday' ? 'weekdays (Mon-Thu)' : 'weekends (Fri-Sun)';
            messageDiv.innerHTML = `<span class="coupon-error">This coupon is only valid for ${validDays}</span>`;
            return;
        }
        
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
    // Use resorts loaded by critical.js or load them
    if (window.resorts && window.resorts.length > 0) {
        resorts = window.resorts;
        displayResorts();
    } else {
        loadResorts();
    }
    loadCoupons();
    setupEventListeners();
    setMinDate();
    setupLogoRotation();
    setupWebSocketSync();
    preloadQRCode();
    
    // Set fallback gallery function if critical.js didn't load
    if (!window.openGallery) {
        window.openGallery = openGalleryFallback;
    }
});





async function loadCoupons(checkIn = null) {
    try {
        const url = checkIn ? `${SERVER_URL}/api/coupons?checkIn=${checkIn}` : `${SERVER_URL}/api/coupons`;
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
        console.log('Loaded coupons:', coupons);
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
    // Navigation - only handle internal anchor links, allow external links to work normally
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
        });
    });
    
    // Ensure external navigation links work properly
    document.querySelectorAll('nav a:not([href^="#"])').forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.cursor = 'pointer';
    });
    


    // Modal close - check if exists
    const closeBtn=document.querySelector('.close');
    if(closeBtn&&!closeBtn.onclick)closeBtn.addEventListener('click',closeModal);
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
    
    // Email validation on blur
    document.getElementById('email').addEventListener('blur', validateEmailField);
    
    // Coupon button event
    document.getElementById('applyCouponBtn').addEventListener('click', applyCouponImpl);
    
    // Phone number validation - only if not already handled
    const phoneInput=document.getElementById('phone');
    if(phoneInput&&!phoneInput.dataset.handled){
        phoneInput.dataset.handled='true';
        phoneInput.addEventListener('input',function(e){
            let value=e.target.value;
            if(value&&!value.startsWith('+91')){
                value='+91'+value.replace(/\D/g,'').substring(0,10);
            }
            if(value.startsWith('+91')){
                value='+91'+value.substring(3).replace(/\D/g,'').substring(0,10);
            }
            e.target.value=value;
        });
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Input sanitization function
function sanitizeInput(input) {
    if (typeof input !== 'string') return String(input || '');
    return input.replace(/[<>"'&\/]/g, function(match) {
        const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;', '/': '&#x2F;'};
        return map[match];
    });
}

async function loadResorts() {
    try {
        const url = `${SERVER_URL}/api/resorts`;
        console.log('🏝️ Fetching resorts from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log('📶 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        resorts = data;
        console.log('✅ Resorts loaded:', resorts.length, 'resorts');
        console.log('🏷️ Resort dynamic pricing data:', resorts.map(r => ({id: r.id, name: r.name, dynamic_pricing: r.dynamic_pricing})));
        displayResorts();
        
    } catch (error) {
        console.error('❌ Error loading resorts:', error);
        showNotification(`Failed to load resorts: ${error.message}`, 'error');
    }
}

function displayResorts() {
    // Skip if critical.js already loaded resorts
    if (window.resorts && document.getElementById('resortsGrid').innerHTML.trim()) {
        console.log('✅ Resorts already loaded by critical.js');
        return;
    }
    
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
        
        const safeId = parseInt(resort.id) || 0;
        return `
            <div class="resort-card">
                <div class="resort-gallery">
                    <img src="${sanitizeInput(resort.image)}" alt="${sanitizeInput(resort.name)}" class="resort-image main-image">
                    <button class="view-more-btn" onclick="openGallery(${safeId})">
                        📸 View More
                    </button>
                </div>
                <div class="resort-info">
                    <h3>${sanitizeInput(resort.name)}</h3>
                    <p class="resort-location">
                        📍 ${sanitizeInput(resort.location)}
                        ${resort.map_link ? `<br><a href="${sanitizeInput(resort.map_link)}" target="_blank" rel="noopener" class="view-map-btn">🗺️ View Map</a>` : ''}
                    </p>
                    <p class="resort-price">${pricingDisplay}</p>
                    <div class="description-container">
                        <p class="description-short" id="desc-short-${safeId}">${resort.description.length > 100 ? sanitizeInput(resort.description).substring(0, 100) + '...' : sanitizeInput(resort.description)}</p>
                        <p class="description-full" id="desc-full-${safeId}" style="display: none;">${sanitizeInput(resort.description)}</p>
                        ${resort.description.length > 100 ? `<button class="view-more-desc" onclick="toggleDescription(${safeId})">View More</button>` : ''}
                    </div>
                    ${resort.amenities ? `
                        <div class="resort-amenities">
                            <h4>🏨 Amenities:</h4>
                            <div class="amenities-list">
                                ${resort.amenities.split('\n').filter(a => a.trim()).map(amenity => 
                                    `<span class="amenity-tag">${sanitizeInput(amenity.trim())}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <button class="book-btn" onclick="openBookingModal(${safeId})">
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
                            <a href="Cancellation &amp; terms and conditions (1).pdf" target="_blank" class="policy-text">Cancellation Policy</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Setup rating functionality after DOM is updated
    setTimeout(setupRatingStars, 100);
}

async function openBookingModal(resortId){
    // Use critical.js function if available
    if(window.bookNow&&window.resorts){
        const resort=window.resorts.find(r=>r.id===resortId);
        if(resort)return window.bookNow(resortId,resort.name);
    }
    
    // Fallback implementation
    const resort=resorts.find(r=>r.id===resortId);
    if(!resort)return;
    
    console.log('Opening booking modal for resort:', resort);
    
    document.getElementById('resortId').value=resortId;
    document.getElementById('resortPrice').value=resort.price;
    document.getElementById('modalResortName').textContent=`Book ${resort.name}`;
    
    // Set phone default
    const phoneInput=document.getElementById('phone');
    if(phoneInput)phoneInput.value='+91';
    
    await loadBlockedDates(resortId);
    calculateTotal();
    document.getElementById('bookingModal').style.display='block';
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
    
    console.log('Dynamic pricing calculation:', {
        resortId: resort.id,
        checkIn: checkIn,
        dayOfWeek: checkInDayOfWeek,
        basePriceFromResort: resort.price,
        dynamicPricing: resort.dynamic_pricing
    });
    
    if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
        // Mon-Thu = weekdays (1,2,3,4), Fri-Sun = weekends (5,6,0)
        if (checkInDayOfWeek === 0 || checkInDayOfWeek === 5 || checkInDayOfWeek === 6) {
            const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
            if (weekendPrice) {
                nightlyRate = weekendPrice.price;
                console.log('Applied weekend pricing:', weekendPrice.price);
            }
        } else {
            // Weekday (Monday=1 to Thursday=4)
            const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
            if (weekdayPrice) {
                nightlyRate = weekdayPrice.price;
                console.log('Applied weekday pricing:', weekdayPrice.price);
            }
        }
    } else {
        console.log('No dynamic pricing found, using base price:', resort.price);
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
    
    // Real-time email validation
    try {
        const emailValidation = await fetch(`${SERVER_URL}/api/validate-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: bookingData.email })
        });
        
        const emailResult = await emailValidation.json();
        if (!emailResult.valid) {
            showNotification('Please enter a valid working email address that can receive emails', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
    } catch (error) {
        console.log('Email validation service unavailable, proceeding...');
    }

    try {
        // Just validate dates and availability, don't create booking yet
        const resort = resorts.find(r => r.id == bookingData.resortId);
        if (!resort) {
            showNotification('Resort not found', 'error');
            return;
        }
        
        // Check availability with server
        const availabilityResponse = await fetch(`${SERVER_URL}/api/check-availability`, {
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
        
        // Calculate pricing with dynamic pricing
        const checkInDate = new Date(bookingData.checkIn);
        const checkOutDate = new Date(bookingData.checkOut);
        const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
        
        // Get dynamic pricing based on check-in date
        const checkInDayOfWeek = checkInDate.getDay();
        let nightlyRate = resort.price;
        
        if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
            // Mon-Thu = weekdays (1,2,3,4), Fri-Sun = weekends (5,6,0)
            if (checkInDayOfWeek === 0 || checkInDayOfWeek === 5 || checkInDayOfWeek === 6) {
                const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
                if (weekendPrice) nightlyRate = weekendPrice.price;
            } else {
                // Weekday (Monday=1 to Thursday=4)
                const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
                if (weekdayPrice) nightlyRate = weekdayPrice.price;
            }
        }
        
        const basePrice = nightlyRate * nights;
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
        
        showScriptPaymentInterface(pendingBookingData);
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
        const response = await fetch(`${SERVER_URL}/api/blocked-dates/${resortId}`);
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
        const eventSource = new EventSource(`${SERVER_URL}/api/events`);
        
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

// Gallery functionality - fallback only
function openGalleryFallback(resortId) {
    console.log('🖼️ Script.js openGallery called for resort:', resortId);
    
    // Try critical.js function first
    if (window.resorts && window.resorts.length > 0) {
        const resort = window.resorts.find(r => r.id == resortId);
        if (resort) {
            console.log('✅ Found resort in window.resorts, using critical.js approach');
            // Call critical.js openGallery directly
            if (typeof window.openGallery === 'function') {
                return;
            }
            // Manual critical.js style gallery
            createDynamicGallery(resort, resortId);
            return;
        }
    }
    
    // Fallback to script.js resorts array
    const resort = resorts.find(r => r.id == resortId);
    if (!resort) {
        console.error('Resort not found in both arrays:', resortId);
        return;
    }
    
    const modal = document.getElementById('galleryModal');
    if (!modal) {
        console.error('Gallery modal not found in DOM');
        return;
    }
    
    currentResortId = resortId;
    currentGalleryImages = [];
    
    if (resort.image) currentGalleryImages.push({type: 'image', url: resort.image});
    if (resort.gallery) {
        resort.gallery.split('\n').filter(img => img.trim()).forEach(img => {
            currentGalleryImages.push({type: 'image', url: img.trim()});
        });
    }
    if (resort.videos) {
        resort.videos.split('\n').filter(url => url.trim()).forEach(video => {
            currentGalleryImages.push({type: 'video', url: video.trim()});
        });
    }
    
    if (currentGalleryImages.length === 0) {
        currentGalleryImages = [
            {type: 'image', url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800'},
            {type: 'image', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'}
        ];
    }
    
    currentGalleryIndex = 0;
    document.getElementById('galleryTitle').textContent = resort.name;
    document.getElementById('galleryDescription').innerHTML = `<p><strong>Location:</strong> ${resort.location}</p><p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p><p>${resort.description}</p>`;
    
    updateGalleryImage();
    setupGalleryThumbnails();
    modal.style.display = 'block';
}

// Create dynamic gallery like critical.js
function createDynamicGallery(resort, resortId) {
    let galleryImages = [];
    if (resort.image) galleryImages.push({type: 'image', url: resort.image});
    if (resort.gallery) {
        resort.gallery.split('\n').filter(img => img.trim()).forEach(img => {
            galleryImages.push({type: 'image', url: img.trim()});
        });
    }
    if (resort.videos) {
        resort.videos.split('\n').filter(url => url.trim()).forEach(video => {
            galleryImages.push({type: 'video', url: video.trim()});
        });
    }
    
    if (galleryImages.length === 0) {
        galleryImages = [
            {type: 'image', url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800'}
        ];
    }
    
    const existingModal = document.getElementById('resortGalleryModal');
    if (existingModal) existingModal.remove();
    
    let currentIndex = 0;
    
    const galleryModal = document.createElement('div');
    galleryModal.id = 'resortGalleryModal';
    galleryModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
    galleryModal.innerHTML = `
        <div style="background:white;padding:20px;border-radius:10px;max-width:90%;max-height:90%;overflow-y:auto;position:relative;">
            <span onclick="closeResortGallery()" style="position:absolute;top:10px;right:15px;font-size:28px;cursor:pointer;color:#999;z-index:10001;">&times;</span>
            <h2 style="margin-bottom:20px;color:#333;">${resort.name}</h2>
            <div style="text-align:center;margin-bottom:20px;">
                <img src="${galleryImages[0].url}" style="max-width:100%;max-height:400px;object-fit:contain;border-radius:8px;">
            </div>
            <div style="background:#f8f9fa;padding:15px;border-radius:8px;">
                <p><strong>Location:</strong> ${resort.location}</p>
                <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
                <p><strong>Description:</strong> ${resort.description}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(galleryModal);
    document.body.style.overflow = 'hidden';
    
    galleryModal.addEventListener('click', function(e) {
        if (e.target === galleryModal) closeResortGallery();
    });
    
    window.closeResortGallery = function() {
        galleryModal.remove();
        document.body.style.overflow = 'auto';
    };
}

function closeGallery() {
    if (window.closeResortGallery) {
        window.closeResortGallery();
        return;
    }
    
    const currentVideo = document.getElementById('currentVideo');
    if (currentVideo) {
        if (currentVideo.tagName === 'VIDEO') {
            currentVideo.pause();
            currentVideo.currentTime = 0;
        } else if (currentVideo.tagName === 'IFRAME') {
            currentVideo.src = currentVideo.src;
        }
    }
    
    const modal = document.getElementById('galleryModal');
    if (modal) modal.style.display = 'none';
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

function showScriptPaymentInterface(booking) {
    // Store booking data for critical.js
    window.pendingCriticalBooking = booking;
    
    // Use critical.js payment interface
    if (window.showPaymentInterface && typeof window.showPaymentInterface === 'function') {
        return window.showPaymentInterface(booking);
    }
    
    // Fallback - create simple modal
    alert('Payment system loading... Please try booking again in a moment.');
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
        await fetch(`${SERVER_URL}/api/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to cancel booking:', error);
    }
}

async function confirmPayment() {
    // Use critical.js payment function
    if (window.confirmCriticalPayment && typeof window.confirmCriticalPayment === 'function') {
        return window.confirmCriticalPayment();
    }
    alert('Payment system loading... Please try again.');
}

function showPaymentMethod(method) {
    // Hide all payment methods
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.payment-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected method
    document.getElementById(`${method}-payment`).classList.add('active');
    event.target.classList.add('active');
}

async function payWithRazorpay(bookingReference, amount, name, email, phone) {
    // Use critical.js payment function
    if (window.payCriticalWithCard && typeof window.payCriticalWithCard === 'function') {
        return window.payCriticalWithCard();
    }
    alert('Payment system loading... Please try again.');
}

async function notifyCardPaymentSuccess(bookingId, paymentId) {
    try {
        // Notify admin immediately about card payment success
        await fetch(`${SERVER_URL}/api/bookings/${bookingId}/notify-card-payment`, {
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
        const response = await fetch(`${SERVER_URL}/api/bookings/${bookingId}/card-payment-proof`, {
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
    const isBookingConfirmation = message.includes('submitted for verification') || message.includes('Payment submitted');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type} ${isBookingConfirmation ? 'booking-confirmation' : ''}`;
    
    if (isBookingConfirmation && type === 'success') {
        notification.innerHTML = `
            <div class="notification-content">
                <div class="success-icon">🎉</div>
                <div class="notification-text">
                    <strong>Booking Confirmed!</strong><br>
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
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 3000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            max-width: 300px;
        `;
    }
    
    document.body.appendChild(notification);
    
    // Add CSS animation for booking confirmations
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
    
    const duration = isBookingConfirmation ? 10000 : (type === 'success' ? 8000 : 5000);
    
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



function toggleDescription(resortId) {
    const shortDesc = document.getElementById(`desc-short-${resortId}`);
    const fullDesc = document.getElementById(`desc-full-${resortId}`);
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

// Real-time email validation
async function validateEmailField() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (!email) return;
    
    // Basic format check first
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        emailInput.style.borderColor = '#dc3545';
        showNotification('Please enter a valid email format', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${SERVER_URL}/api/validate-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const result = await response.json();
        
        if (result.valid) {
            emailInput.style.borderColor = '#28a745';
        } else {
            emailInput.style.borderColor = '#dc3545';
            showNotification(result.reason || 'Invalid email address', 'error');
        }
    } catch (error) {
        console.log('Email validation service unavailable');
        emailInput.style.borderColor = '#ddd';
    }
}
// Rotating Banner Animation
let currentSlide = 0;
const slides = document.querySelectorAll('.banner-slide');
const totalSlides = slides.length;

function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % totalSlides;
    slides[currentSlide].classList.add('active');
}

// Start banner rotation every 8 seconds
if (slides.length > 1) {
    setInterval(nextSlide, 8000);
}