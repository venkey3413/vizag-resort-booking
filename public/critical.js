// CSRF token management
function getCSRFToken() {
    let token = sessionStorage.getItem('csrf-token');
    if (!token) {
        token = 'csrf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('csrf-token', token);
    }
    return token;
}

// Initialize CSRF token on page load
getCSRFToken();

// Critical JavaScript - only essential functions
function scrollToSection(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}

// Banner rotation
window.currentSlide=0;
function initBannerRotation(){
    const slides=document.querySelectorAll('.banner-slide');
    if(slides.length>0){
        function showSlide(n){slides.forEach(s=>s.classList.remove('active'));slides[n].classList.add('active')}
        function nextSlide(){window.currentSlide=(window.currentSlide+1)%slides.length;showSlide(window.currentSlide)}
        setInterval(nextSlide,5000);
    }
}

// Initialize when DOM is ready
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){initBannerRotation();setupModalEvents();setupUniversalModalClose()})}else{initBannerRotation();setupModalEvents();setupUniversalModalClose()}

// Universal modal close functionality
function setupUniversalModalClose() {
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        // Check if click is on modal backdrop
        if (e.target.classList.contains('vrb-modal') || 
            e.target.classList.contains('payment-modal') ||
            e.target.id === 'resortGalleryModal' ||
            e.target.id === 'reviewModal' ||
            e.target.id === 'viewReviewsModal') {
            
            if (e.target.classList.contains('vrb-modal') || e.target.id === 'bookingModal') {
                window.closeBookingModal();
            } else if (e.target.classList.contains('payment-modal')) {
                window.closePaymentModal();
            } else if (e.target.id === 'resortGalleryModal') {
                closeResortGallery();
            } else if (e.target.id === 'reviewModal') {
                window.closeReviewModal();
            } else if (e.target.id === 'viewReviewsModal') {
                window.closeViewReviewsModal();
            }
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close any open modal
            if (document.getElementById('bookingModal') && document.getElementById('bookingModal').classList.contains('show')) {
                window.closeBookingModal();
            } else if (document.querySelector('.payment-modal')) {
                window.closePaymentModal();
            } else if (document.getElementById('resortGalleryModal')) {
                closeResortGallery();
            } else if (document.getElementById('reviewModal')) {
                window.closeReviewModal();
            } else if (document.getElementById('viewReviewsModal')) {
                window.closeViewReviewsModal();
            }
        }
    });
}

// Modal close function - unified for all modals
window.closeModal=function(){
    const modal=document.getElementById('bookingModal');
    if(modal){
        modal.style.display='none';
        modal.classList.remove('show');
        document.getElementById('bookingForm').reset();
        document.body.style.overflow = 'auto';
    }
}

// Booking modal specific close function
window.closeBookingModal=function(){
    const modal=document.getElementById('bookingModal');
    if(modal){
        modal.style.display='none';
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Alias for compatibility
window.closeBookingPopup = window.closeBookingModal;

// Setup modal events
function setupModalEvents(){
    // Close button - wait for DOM
    setTimeout(function(){
        // Multiple selectors for close buttons
        const closeBtns = document.querySelectorAll('.close, .vrb-close, [onclick*="closeModal"], [onclick*="closeBookingModal"]');
        closeBtns.forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.closeBookingModal();
            };
        });
        
        // Form submission
        const form=document.getElementById('bookingForm');
        if(form)form.onsubmit=window.handleBookingSubmit;
        
        // Email input (OTP verification disabled)
        const emailInput=document.getElementById('email');
        if(emailInput){
            emailInput.addEventListener('input',function(){
                // OTP verification disabled - no action needed
            });
        }
        
        // Phone input auto +91
        const phoneInput=document.getElementById('phone');
        if(phoneInput){
            phoneInput.addEventListener('focus',function(){
                if(!this.value||this.value==='+91')this.value='+91';
            });
            phoneInput.addEventListener('input',function(){
                let val=this.value;
                if(!val.startsWith('+91'))val='+91'+val.replace(/\D/g,'').substring(0,10);
                if(val.startsWith('+91'))val='+91'+val.substring(3).replace(/\D/g,'').substring(0,10);
                this.value=val;
            });
        }
        
        // Email OTP button events
        const sendEmailOtpBtn=document.getElementById('sendEmailOtpBtn');
        if(sendEmailOtpBtn){
            sendEmailOtpBtn.onclick=sendEmailOTP;
        }
        
        const verifyEmailOtpBtn=document.getElementById('verifyEmailOtpBtn');
        if(verifyEmailOtpBtn){
            verifyEmailOtpBtn.onclick=verifyEmailOTP;
        }
    },100);
    
    // Disable click outside modal to close
    // window.onclick=function(event){
    //     const modal=document.getElementById('bookingModal');
    //     if(event.target===modal)window.closeModal();
    // }
}

// Mobile performance detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
const isSlowDevice = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;

// Load resorts immediately with CSRF protection - start fetch early
const resortsPromise = fetch('/api/resorts',{headers:{'X-Requested-With':'XMLHttpRequest','Content-Type':'application/json'}}).then(r=>{
    console.log('🏨 Resort API response status:', r.status);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}).then(resorts => {
    // Preload first 3 resort images for faster rendering
    if(resorts && resorts.length > 0) {
        resorts.slice(0, 3).forEach(resort => {
            if(resort.image) {
                const img = new Image();
                img.src = resort.image;
            }
        });
    }
    return resorts;
});

// Mobile-optimized resort rendering with lazy loading
function renderResorts(resorts) {
    console.log('🏨 Resorts loaded:', resorts.length, 'resorts');
    
    // ✅ CRITICAL FIX: Always update global resorts array
    window.resorts = resorts;
    
    // Load unique locations into hero search dropdown
    loadLocationsIntoHeroSearch(resorts);
    
    const grid = document.getElementById('resortsGrid');
    if (!grid) {
        console.error('❌ Resort grid element not found');
        return;
    }
    
    if (!resorts || resorts.length === 0) {
        grid.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No resorts available at the moment.</p>';
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    const sanitize = s => {
        if (!s) return '';
        const str = String(s);
        return str.replace(/[<>"'&\/]/g, m => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','&':'&amp;','/':'&#x2F;'}[m] || m));
    };
    
    if (isMobile) {
        // Mobile-optimized rendering with progressive loading
        grid.innerHTML = '';
        
        // Load first 3 cards immediately for better perceived performance
        const immediateLoad = resorts.slice(0, 3);
        const deferredLoad = resorts.slice(3);
        
        immediateLoad.forEach(r => {
            const card = createMobileResortCard(r, sanitize);
            grid.appendChild(card);
        });
        
        // Load remaining cards with staggered timing
        deferredLoad.forEach((r, index) => {
            setTimeout(() => {
                const card = createMobileResortCard(r, sanitize);
                grid.appendChild(card);
            }, (index + 1) * (isSlowDevice ? 100 : 30));
        });
    } else {
        // Desktop rendering (existing logic)
        grid.innerHTML = resorts.map(r => createDesktopResortHTML(r, sanitize)).join('');
    }
    
    console.log('✅ Resorts displayed successfully - Total:', resorts.length);
    
    // Add structured data for SEO
    addResortStructuredData(resorts);
}

// Load unique locations from resorts into hero search
function loadLocationsIntoHeroSearch(resorts) {
    const locationSelect = document.getElementById('locationSelect');
    if (!locationSelect || !resorts) return;
    
    // Store current selection
    const currentSelection = locationSelect.value;
    
    // Get unique locations from resorts
    const uniqueLocations = [...new Set(resorts.map(r => r.location).filter(Boolean))].sort();
    
    // Clear existing options
    locationSelect.innerHTML = '';
    
    // Add "All Locations" option
    const allOption = document.createElement('option');
    allOption.value = 'All Locations';
    allOption.textContent = 'All Locations';
    locationSelect.appendChild(allOption);
    
    // Add location options
    uniqueLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationSelect.appendChild(option);
    });
    
    // Restore previous selection if it exists, otherwise default to All Locations
    if (currentSelection && [...locationSelect.options].some(opt => opt.value === currentSelection)) {
        locationSelect.value = currentSelection;
    } else {
        locationSelect.value = 'All Locations';
    }
    
    console.log('📍 Loaded', uniqueLocations.length, 'locations into hero search:', uniqueLocations);
    console.log('📍 Current selection:', locationSelect.value);
}

// Add structured data for individual resorts for better SEO
function addResortStructuredData(resorts) {
    const existingScript = document.getElementById('resort-structured-data');
    if(existingScript) existingScript.remove();
    
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Vizag Resorts",
        "description": "Premium beach resorts in Visakhapatnam",
        "itemListElement": resorts.map((resort, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "Resort",
                "name": resort.name,
                "description": resort.description,
                "image": {
                    "@type": "ImageObject",
                    "url": resort.image,
                    "description": `${resort.name} - Best resorts in Vizag ${resort.location} with private pool, swimming pool. Top vizag resorts near beach for family vacation and corporate stays`,
                    "caption": `${resort.name} - Best resort in Vizag with private pool, nearby resorts ${resort.location} for weekend getaway and luxury accommodation`
                },
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": resort.location,
                    "addressRegion": "Andhra Pradesh",
                    "addressCountry": "India"
                },
                "priceRange": `₹${resort.price}`,
                "url": `https://vizagresortbooking.in#resort-${resort.id}`,
                "amenityFeature": resort.amenities ? resort.amenities.split('\n').filter(a => a.trim()).map(amenity => ({
                    "@type": "LocationFeatureSpecification",
                    "name": amenity.trim()
                })) : [],
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.5",
                    "reviewCount": "50"
                }
            }
        }))
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'resort-structured-data';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
    
    // Update page title and meta description with resort names for better SEO
    const resortNames = resorts.slice(0, 3).map(r => r.name).join(', ');
    const locationNames = [...new Set(resorts.map(r => r.location))].slice(0, 3).join(', ');
    document.title = `Book Resorts in Vizag | ${resortNames} | Best Resorts in Visakhapatnam with Private Pool`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc) {
        metaDesc.content = `Book resorts in Vizag with instant confirmation. ${resortNames} and more best resorts in ${locationNames}, Visakhapatnam with private pool, swimming pool. Top vizag resorts near RK Beach, Rushikonda, Yarada with luxury amenities and best prices.`;
    }
    
    // Update meta keywords dynamically
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if(metaKeywords) {
        const dynamicKeywords = resorts.map(r => `${r.name.toLowerCase()}, book ${r.name.toLowerCase()}, ${r.location.toLowerCase()} resorts`).slice(0, 5).join(', ');
        metaKeywords.content += `, ${dynamicKeywords}`;
    }
}

// Mobile-optimized resort card creation
function createMobileResortCard(r, sanitize) {
    const safeId=parseInt(r.id)||0;
    const safeName=sanitize(r.name).replace(/[^a-zA-Z0-9\s]/g,'');
    
    let pricingDisplay=`₹${r.price.toLocaleString()}/night`;
    if(r.dynamic_pricing&&r.dynamic_pricing.length>0){
        pricingDisplay=`From ₹${r.price.toLocaleString()}/night`;
    }
    
    const card = document.createElement('div');
    card.className = 'resort-card';
    
    // Use different rendering for slow devices
    if(isSlowDevice) {
        card.innerHTML = `
            <div class="resort-info">
                <h3>${sanitize(r.name)}</h3>
                <p class="resort-location">📍 ${sanitize(r.location)}</p>
                <p class="resort-price">${pricingDisplay}</p>
                <button class="book-btn" onclick="bookNow(${safeId},'${safeName}')">Book Now</button>
            </div>
        `;
    } else {
        const description = sanitize(r.description);
        const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
        const needsExpansion = description.length > 100;
        
        card.innerHTML = `
            <div class="resort-gallery">
                <img data-src="${sanitize(r.image)}" alt="${sanitize(r.name)} - Best resorts in Vizag near ${sanitize(r.location)} with private pool, luxury amenities. Top vizag resorts for family vacation and corporate stays" class="resort-image lazy-load" loading="lazy" title="${sanitize(r.name)} - Best resort in Vizag with private pool | Nearby resorts ${sanitize(r.location)} | Book now">
                <button class="view-more-btn" onclick="openGallery(${safeId})">📸 View More</button>
            </div>
            <div class="resort-info">
                <h3>${sanitize(r.name)}</h3>
                <p class="resort-location">📍 ${sanitize(r.location)}${r.map_link?`<br><a href="${sanitize(r.map_link)}" target="_blank" rel="noopener" class="view-map-btn">🗺️ View Map</a>`:''}</p>
                <p class="resort-price">${pricingDisplay}</p>
                <div class="description-container">
                    <p class="description-short" id="desc-short-${safeId}">${shortDesc}</p>
                    <p class="description-full" id="desc-full-${safeId}" style="display: none;">${description}</p>
                    ${needsExpansion ? `<button class="view-more-desc" onclick="toggleDescription(${safeId})">View More</button>` : ''}
                </div>
                ${r.amenities?`<div class="resort-amenities"><h4>🏨 Amenities:</h4><div class="amenities-list">${r.amenities.split('\n').filter(a=>a.trim()).map(amenity=>`<span class="amenity-tag">${sanitize(amenity.trim())}</span>`).join('')}</div></div>`:''}
                <div class="resort-actions">
                    <button class="book-btn" onclick="bookNow(${safeId},'${safeName}')">Book Now</button>
                    <button class="review-btn" onclick="openReviewModal(${safeId},'${safeName}')">Write a Review</button>
                    <button class="view-reviews-btn" onclick="viewReviews(${safeId},'${safeName}')">View Reviews</button>
                </div>
            </div>
        `;
        
        // Setup lazy loading only for devices with images
        const img = card.querySelector('.lazy-load');
        if(img) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if(entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-load');
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin: '100px' });
            observer.observe(img);
        }
    }
    
    return card;
}

// Desktop resort HTML creation  
function createDesktopResortHTML(r, sanitize) {
    let pricingDisplay=`₹${r.price.toLocaleString()}/night`;
    if(r.dynamic_pricing&&r.dynamic_pricing.length>0){
        pricingDisplay=`From ₹${r.price.toLocaleString()}/night`;
        const weekdayPrice=r.dynamic_pricing.find(p=>p.day_type==='weekday');
        const weekendPrice=r.dynamic_pricing.find(p=>p.day_type==='weekend');
        if(weekdayPrice||weekendPrice){
            pricingDisplay+='<br><small>';
            if(weekdayPrice)pricingDisplay+=`Weekday: ₹${weekdayPrice.price.toLocaleString()}`;
            if(weekdayPrice&&weekendPrice)pricingDisplay+=' | ';
            if(weekendPrice)pricingDisplay+=`Weekend: ₹${weekendPrice.price.toLocaleString()}`;
            pricingDisplay+='</small>';
        }
    }
    const safeId=parseInt(r.id)||0;
    const safeName=sanitize(r.name).replace(/[^a-zA-Z0-9\s]/g,'');
    const description = sanitize(r.description);
    const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
    const needsExpansion = description.length > 100;
    
    return `<div class="resort-card" id="resort-${safeId}" itemscope itemtype="https://schema.org/Resort"><div class="resort-gallery"><img src="${sanitize(r.image)}" alt="${sanitize(r.name)} - Best resorts in Vizag ${sanitize(r.location)} with private pool, swimming pool. Top vizag resorts near beach, nearby resorts for weekend getaway" class="resort-image main-image" itemprop="image" title="${sanitize(r.name)} - Best resort in Vizag with private pool | Nearby resorts ${sanitize(r.location)} | ₹${r.price}/night"><button class="view-more-btn" onclick="openGallery(${safeId})">📸 View More</button></div><div class="resort-info"><h3 itemprop="name">${sanitize(r.name)}</h3><p class="resort-location" itemprop="address">📍 ${sanitize(r.location)}${r.map_link?`<br><a href="${sanitize(r.map_link)}" target="_blank" rel="noopener" class="view-map-btn">🗺️ View Map</a>`:''}</p><p class="resort-price" itemprop="priceRange">${pricingDisplay}</p><div class="description-container"><p class="description-short" id="desc-short-${safeId}" itemprop="description">${shortDesc}</p><p class="description-full" id="desc-full-${safeId}" style="display: none;" itemprop="description">${description}</p>${needsExpansion ? `<button class="view-more-desc" onclick="toggleDescription(${safeId})">View More</button>` : ''}</div>${r.amenities?`<div class="resort-amenities"><h4>🏨 Amenities:</h4><div class="amenities-list" itemprop="amenityFeature">${r.amenities.split('\n').filter(a=>a.trim()).map(amenity=>`<span class="amenity-tag">${sanitize(amenity.trim())}</span>`).join('')}</div></div>`:''}<div class="resort-actions"><button class="book-btn" onclick="bookNow(${safeId},'${safeName}')">Book Now</button><button class="review-btn" onclick="openReviewModal(${safeId},'${safeName}')">Write a Review</button><button class="view-reviews-btn" onclick="viewReviews(${safeId},'${safeName}')">View Reviews</button></div></div></div>`;
}

// Handle both DOM ready and data ready with safety checks
function handleResortsLoad(){
    resortsPromise.then(renderResorts).catch(e=>{
        console.error('❌ Resort loading failed:', e);
        const grid=document.getElementById('resortsGrid');
        if(grid)grid.innerHTML='<p style="text-align:center;padding:2rem;color:#dc3545;">Failed to load resorts. Please refresh the page.</p>';
    });
}

if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',handleResortsLoad);
}else{
    handleResortsLoad();
}

// Cache clearing
if(!sessionStorage.getItem('cache_cleared_v7')){sessionStorage.setItem('cache_cleared_v7','true');window.location.reload(true)}



// Direct booking function
window.bookNow=function(resortId,resortName){
    const modal=document.getElementById('bookingModal');
    if(modal){
        const resort=window.resorts.find(r=>r.id==resortId);
        if(resort){
            document.getElementById('resortId').value=resortId;
            document.getElementById('resortPrice').value=resort.price;
            document.getElementById('modalResortName').textContent=`Book ${resortName}`;
            document.getElementById('modalResortLocation').textContent=resort.location;
            document.getElementById('modalResortPrice').textContent=`₹${resort.price.toLocaleString()}/night`;
            
            // Reset coupon data
            window.appliedCouponCode = null;
            window.appliedDiscountAmount = 0;
            document.getElementById('couponCode').value = '';
            document.getElementById('couponMessage').innerHTML = '';
            document.getElementById('discountRow').style.display = 'none';
            
            // Set default +91 for phone
            const phoneInput=document.getElementById('phone');
            if(phoneInput){
                phoneInput.value='+91';
                phoneInput.focus();
                phoneInput.blur();
            }
            
            // Hide OTP elements (if they exist)
            const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');
            const emailOtpGroup = document.getElementById('emailOtpGroup');
            if (sendEmailOtpBtn) sendEmailOtpBtn.style.display = 'none';
            if (emailOtpGroup) emailOtpGroup.style.display = 'none';
            
            // Enable booking button by default
            const bookBtn = document.querySelector('#bookingModal .book-btn');
            if (bookBtn) {
                bookBtn.disabled = false;
                bookBtn.textContent = 'Confirm Booking';
            }
            
            const today=new Date().toISOString().split('T')[0];
            const tomorrow=new Date();
            tomorrow.setDate(tomorrow.getDate()+1);
            
            // Set minimum dates to prevent past bookings
            document.getElementById('checkIn').min = today;
            document.getElementById('checkOut').min = tomorrow.toISOString().split('T')[0];
            
            // Reset ALL form data when opening new booking
            document.getElementById('guestName').value = '';
            document.getElementById('email').value = '';
            document.getElementById('phone').value = '+91';
            document.getElementById('guests').value = '2';
            
            // Don't set hardcoded dates - let user select
            document.getElementById('checkIn').value='';
            document.getElementById('checkOut').value='';
            
            // Load blocked dates for this resort
            fetch(`/api/blocked-dates/${resortId}`).then(r=>r.json()).then(blockedDates=>{
                console.log('🚫 Blocked dates for resort', resortId, ':', blockedDates);
                window.currentResortBlockedDates = blockedDates;
            }).catch(e=>console.log('Failed to load blocked dates:', e));
            
            // Auto-update checkout and pricing when dates change
            const checkInInput = document.getElementById('checkIn');
            const checkOutInput = document.getElementById('checkOut');
            
            checkInInput.addEventListener('change', function() {
                const selectedDate = this.value;
                
                // Check if selected date is blocked
                if (window.currentResortBlockedDates && window.currentResortBlockedDates.includes(selectedDate)) {
                    showCriticalNotification('🚫 This date is blocked by the resort owner. Please choose another date.', 'error');
                    this.value = '';
                    return;
                }
                
                const checkInDate = new Date(selectedDate);
                const nextDay = new Date(checkInDate);
                nextDay.setDate(nextDay.getDate() + 1);
                document.getElementById('checkOut').value = nextDay.toISOString().split('T')[0];
                document.getElementById('checkOut').min = nextDay.toISOString().split('T')[0];
                
                // Show dynamic pricing for selected date
                showDynamicPriceForDate(selectedDate);
                
                // Update pricing and show available coupons
                setTimeout(() => {
                    updatePricing();
                    showAvailableCouponsForDate();
                }, 100);
            });
            
            checkOutInput.addEventListener('change', function(){
                // Update pricing and show available coupons
                setTimeout(() => {
                    updatePricing();
                    showAvailableCouponsForDate();
                }, 100);
            });
            
            // Update guests label to show max guests
            const guestsLabel = document.getElementById('guestsLabel');
            if (resort.max_guests) {
                guestsLabel.textContent = `Number of Guests (Max: ${resort.max_guests}):`;
            } else {
                guestsLabel.textContent = 'Number of Guests:';
            }
            
            // Guest count warning
            const guestsInput = document.getElementById('guests');
            const guestWarning = document.getElementById('guestWarning');
            
            guestsInput.addEventListener('input', function() {
                const guestCount = parseInt(this.value) || 0;
                const maxGuests = resort.max_guests;
                
                if (maxGuests && guestCount > maxGuests) {
                    guestWarning.style.display = 'block';
                } else {
                    guestWarning.style.display = 'none';
                }
            });
            
            // Load coupons for booking modal with resort filter
            const loadBookingModalCoupons = () => {
                let url = '/api/coupons';
                const params = new URLSearchParams();
                if (resortId) params.append('resortId', resortId);
                if (params.toString()) url += '?' + params.toString();
                
                fetch(url).then(r=>r.json()).then(coupons=>{
                    window.bookingModalCoupons = {};
                    window.allCoupons = coupons;
                    
                    const filteredCoupons = coupons.filter(c => 
                        c.resort_id === null || c.resort_id == resortId
                    );
                    
                    filteredCoupons.forEach(c => {
                        window.bookingModalCoupons[c.code] = {
                            discount: c.discount, 
                            type: c.type, 
                            day_type: c.day_type, 
                            resort_id: c.resort_id
                        };
                    });
                }).catch(e=>console.log('❌ Coupon load failed:', e));
            };
            
            loadBookingModalCoupons();
            
            // Setup coupon application in booking modal
            const applyCouponBtn = document.getElementById('applyCouponBtn');
            if (applyCouponBtn) {
                applyCouponBtn.onclick = function() {
                    const code = document.getElementById('couponCode').value.trim().toUpperCase();
                    const checkIn = document.getElementById('checkIn').value;
                    const msg = document.getElementById('couponMessage');
                    
                    console.log('🎫 Applying coupon in booking modal:', code);
                    
                    if (!code) {
                        msg.innerHTML = '<span style="color:#dc3545;">Enter coupon code</span>';
                        return;
                    }
                    
                    if (!window.bookingModalCoupons) {
                        msg.innerHTML = '<span style="color:#dc3545;">Coupons not loaded yet, please try again</span>';
                        return;
                    }
                    
                    const coupon = window.bookingModalCoupons[code];
                    if (!coupon) {
                        const resortName = window.resorts.find(r => r.id == resortId)?.name || 'this resort';
                        msg.innerHTML = `<span style="color:#dc3545;">This coupon is not valid for ${resortName} on the selected date</span>`;
                        console.log('❌ Coupon not found for resort:', code, 'Resort ID:', resortId);
                        return;
                    }
                    

                    
                    console.log('✅ Found coupon:', coupon);
                    
                    // Check day type
                    const checkInDate = new Date(checkIn);
                    const dayOfWeek = checkInDate.getDay();
                    let dayType = 'weekday';
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        dayType = 'weekend';
                    }
                    
                    console.log('🎫 Applying coupon - Day type:', dayType, 'Coupon day type:', coupon.day_type);
                    
                    if (coupon.day_type && coupon.day_type !== 'all' && coupon.day_type !== dayType) {
                        let validDays;
                        if (coupon.day_type === 'weekday') {
                            validDays = 'weekdays (Mon-Thu)';
                        } else if (coupon.day_type === 'friday') {
                            validDays = 'Friday';
                        } else if (coupon.day_type === 'weekend') {
                            validDays = 'weekends (Sat-Sun)';
                        } else {
                            validDays = coupon.day_type;
                        }
                        msg.innerHTML = `<span style="color:#dc3545;">Valid only for ${validDays}</span>`;
                        return;
                    }
                    
                    // Calculate current total
                    const baseAmountText = document.getElementById('baseAmount').textContent;
                    const currentTotal = parseInt(baseAmountText.replace(/[^0-9]/g, '')) || 0;
                    
                    // Calculate discount
                    let discountAmount = 0;
                    if (coupon.type === 'percentage') {
                        discountAmount = Math.round(currentTotal * coupon.discount / 100);
                    } else {
                        discountAmount = coupon.discount;
                    }
                    
                    // Update display
                    document.getElementById('discountAmount').textContent = `-₹${discountAmount.toLocaleString()}`;
                    document.getElementById('discountRow').style.display = 'block';
                    document.getElementById('totalAmount').textContent = `₹${(currentTotal - discountAmount).toLocaleString()}`;
                    msg.innerHTML = `<span style="color:#28a745;">Coupon applied! Saved ₹${discountAmount.toLocaleString()}</span>`;
                    
                    // Store coupon data for form submission
                    window.appliedCouponCode = code;
                    window.appliedDiscountAmount = discountAmount;
                    
                    console.log('✅ Coupon applied in booking modal:', {code, discountAmount});
                };
            }
            
            // Dynamic pricing calculation function
            function updatePricing() {
                const checkIn = document.getElementById('checkIn').value;
                const checkOut = document.getElementById('checkOut').value;
                
                console.log('💰 Updating pricing - CheckIn:', checkIn, 'CheckOut:', checkOut);
                
                if (checkIn && checkOut) {
                    const checkInDate = new Date(checkIn);
                    const checkOutDate = new Date(checkOut);
                    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
                    
                    console.log('💰 Nights calculated:', nights);
                    
                    // Apply dynamic pricing
                    const checkInDayOfWeek = checkInDate.getDay();
                    let nightlyRate = resort.price;
                    
                    if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
                        // Mon-Fri = weekdays (1,2,3,4,5), Sat-Sun = weekends (6,0)
                        if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
                            // Weekend (Saturday=6, Sunday=0)
                            const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
                            if (weekendPrice) nightlyRate = weekendPrice.price;
                        } else {
                            // Weekday (Monday=1 to Friday=5)
                            const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
                            if (weekdayPrice) nightlyRate = weekdayPrice.price;
                        }
                    }
                    
                    const basePrice = nightlyRate * nights;
                    const platformFee = Math.round(basePrice * 0.015);
                    const total = basePrice + platformFee;
                    
                    console.log('💰 Pricing calculated - Base:', basePrice, 'Platform Fee:', platformFee, 'Total:', total);
                    
                    // Update pricing display elements
                    const baseAmountEl = document.getElementById('baseAmount');
                    const platformFeeEl = document.getElementById('platformFee');
                    const totalAmountEl = document.getElementById('totalAmount');
                    
                    if (baseAmountEl) baseAmountEl.textContent = `₹${basePrice.toLocaleString()}`;
                    if (platformFeeEl) platformFeeEl.textContent = `₹${platformFee.toLocaleString()}`;
                    if (totalAmountEl) totalAmountEl.textContent = `₹${total.toLocaleString()}`;
                    
                    // Recalculate coupon discount if applied
                    if (window.appliedCouponCode && window.bookingModalCoupons) {
                        const coupon = window.bookingModalCoupons[window.appliedCouponCode];
                        if (coupon) {
                            // Check day type for new date
                            const dayOfWeek = checkInDate.getDay();
                            let dayType = 'weekday';
                            if (dayOfWeek === 5) {
                                dayType = 'friday';
                            } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                                dayType = 'weekend';
                            }
                            
                            if (coupon.day_type === 'all' || coupon.day_type === dayType) {
                                // Recalculate discount
                                let discountAmount = 0;
                                if (coupon.type === 'percentage') {
                                    discountAmount = Math.round(total * coupon.discount / 100);
                                } else {
                                    discountAmount = coupon.discount;
                                }
                                
                                window.appliedDiscountAmount = discountAmount;
                                const finalTotal = total - discountAmount;
                                if (totalAmountEl) totalAmountEl.textContent = `₹${finalTotal.toLocaleString()}`;
                                const discountEl = document.getElementById('discountAmount');
                                if (discountEl) discountEl.textContent = `-₹${discountAmount.toLocaleString()}`;
                                const discountRowEl = document.getElementById('discountRow');
                                if (discountRowEl) discountRowEl.style.display = 'block';
                                const couponMsgEl = document.getElementById('couponMessage');
                                if (couponMsgEl) couponMsgEl.innerHTML = `<span style="color:#28a745;">Coupon applied! Saved ₹${discountAmount.toLocaleString()}</span>`;
                            } else {
                                // Coupon not valid for new date
                                window.appliedCouponCode = null;
                                window.appliedDiscountAmount = 0;
                                if (totalAmountEl) totalAmountEl.textContent = `₹${total.toLocaleString()}`;
                                const discountRowEl = document.getElementById('discountRow');
                                if (discountRowEl) discountRowEl.style.display = 'none';
                                const validDays = coupon.day_type === 'weekday' ? 'weekdays (Mon-Fri)' : 'weekends (Sat-Sun)';
                                const couponMsgEl = document.getElementById('couponMessage');
                                if (couponMsgEl) couponMsgEl.innerHTML = `<span style="color:#dc3545;">Coupon removed - valid only for ${validDays}</span>`;
                            }
                        } else {
                            if (totalAmountEl) totalAmountEl.textContent = `₹${total.toLocaleString()}`;
                            const discountRowEl = document.getElementById('discountRow');
                            if (discountRowEl) discountRowEl.style.display = 'none';
                        }
                    } else {
                        if (totalAmountEl) totalAmountEl.textContent = `₹${total.toLocaleString()}`;
                        const discountRowEl = document.getElementById('discountRow');
                        if (discountRowEl) discountRowEl.style.display = 'none';
                    }
                } else {
                    console.log('💰 Missing dates for pricing calculation');
                    // Set default pricing when dates are missing
                    const basePrice = resort.price;
                    const platformFee = Math.round(basePrice * 0.015);
                    const total = basePrice + platformFee;
                    
                    const baseAmountEl = document.getElementById('baseAmount');
                    const platformFeeEl = document.getElementById('platformFee');
                    const totalAmountEl = document.getElementById('totalAmount');
                    
                    if (baseAmountEl) baseAmountEl.textContent = `₹${basePrice.toLocaleString()}`;
                    if (platformFeeEl) platformFeeEl.textContent = `₹${platformFee.toLocaleString()}`;
                    if (totalAmountEl) totalAmountEl.textContent = `₹${total.toLocaleString()}`;
                }
            }
            
            // Reset pricing display to default
            document.getElementById('baseAmount').textContent = `₹${resort.price.toLocaleString()}`;
            document.getElementById('platformFee').textContent = `₹${Math.round(resort.price * 0.015).toLocaleString()}`;
            document.getElementById('totalAmount').textContent = `₹${(resort.price + Math.round(resort.price * 0.015)).toLocaleString()}`;
            
            // Function to show dynamic pricing for selected date
            window.showDynamicPriceForDate = function(selectedDate) {
                const checkInDate = new Date(selectedDate);
                const dayOfWeek = checkInDate.getDay();
                let nightlyRate = resort.price;
                let dayTypeText = 'Regular';
                let hasDynamicPricing = false;
                
                if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
                    hasDynamicPricing = true;
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        // Weekend
                        const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
                        if (weekendPrice) {
                            nightlyRate = weekendPrice.price;
                            dayTypeText = 'Weekend';
                        }
                    } else {
                        // Weekday (Mon-Fri)
                        const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
                        if (weekdayPrice) {
                            nightlyRate = weekdayPrice.price;
                            dayTypeText = 'Weekday';
                        }
                    }
                } else {
                    // No dynamic pricing configured - show day type but same price
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        dayTypeText = 'Weekend';
                    } else {
                        dayTypeText = 'Weekday';
                    }
                }
                
                // Show pricing info near calendar
                let priceInfo = document.getElementById('dynamicPriceInfo');
                if (!priceInfo) {
                    priceInfo = document.createElement('div');
                    priceInfo.id = 'dynamicPriceInfo';
                    priceInfo.style.cssText = 'margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007bff;';
                    document.getElementById('checkIn').parentNode.appendChild(priceInfo);
                }
                
                const dateStr = checkInDate.toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                const pricingNote = hasDynamicPricing ? '' : '<br><small style="color:#666;">💡 Dynamic pricing not configured - same rate for all days</small>';
                
                priceInfo.innerHTML = `
                    <strong>📅 ${dateStr}</strong><br>
                    <span style="color: #007bff;">💰 ${dayTypeText} Rate: ₹${nightlyRate.toLocaleString()}/night</span>${pricingNote}
                `;
            }
            
            // Setup global coupon functions
            window.showAvailableCoupons = function(){
                showAvailableCouponsForDate();
            }
            
            window.selectCoupon = function(code){
                console.log('🎫 Selecting coupon:', code);
                document.getElementById('couponCode').value = code;
                document.getElementById('availableCoupons').style.display = 'none';
                // Trigger coupon application
                setTimeout(() => {
                    document.getElementById('applyCouponBtn').click();
                }, 100);
            }
            
            window.showAvailableCouponsForDate = function(){
                const checkIn = document.getElementById('checkIn').value;
                if (!checkIn || !window.allCoupons) {
                    console.log('🎫 No check-in date or coupons available');
                    return;
                }
                
                const checkInDate = new Date(checkIn);
                const dayOfWeek = checkInDate.getDay();
                // Mon-Fri = weekdays (1,2,3,4,5), Sat-Sun = weekends (6,0)
                let dayType = 'weekday';
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    dayType = 'weekend';
                }
                
                console.log('🎫 Check-in date:', checkIn, 'Day type:', dayType, 'Day of week:', dayOfWeek);
                
                const validCoupons = window.allCoupons.filter(c => {
                    const resortMatch = c.resort_id === null || c.resort_id == resortId;
                    const dayMatch = c.day_type === 'all' || c.day_type === dayType;
                    console.log('🎫 Coupon', c.code, '- Resort match:', resortMatch, 'Day match:', dayMatch, 'Resort ID:', c.resort_id, 'Day type:', c.day_type);
                    return resortMatch && dayMatch;
                });
                
                console.log('🎫 Valid coupons for', dayType, ':', validCoupons);
                
                const couponInput = document.getElementById('couponCode');
                const couponsDiv = document.getElementById('availableCoupons');
                
                if (validCoupons.length > 0) {
                    const bestCoupon = validCoupons[0];
                    couponInput.placeholder = `Available: ${bestCoupon.code} - ${bestCoupon.type === 'percentage' ? bestCoupon.discount + '% OFF' : '₹' + bestCoupon.discount + ' OFF'}`;
                    
                    // Auto-show available coupons
                    couponsDiv.style.display = 'block';
                    couponsDiv.innerHTML = `
                        <div style="background:#e8f5e8;padding:8px;border-radius:5px;margin-bottom:10px;">
                            <strong>🎫 Available Coupons for ${dayType.charAt(0).toUpperCase() + dayType.slice(1)}:</strong>
                        </div>
                    ` + validCoupons.map(coupon => {
                        const discountText = coupon.type === 'percentage' ? `${coupon.discount}% OFF` : `₹${coupon.discount} OFF`;
                        const dayText = coupon.day_type === 'weekday' ? ' (Mon-Fri)' : 
                                      coupon.day_type === 'weekend' ? ' (Sat-Sun)' : ' (All Days)';
                        return `
                            <div class="coupon-option" onclick="selectCoupon('${coupon.code}')" style="
                                padding:10px 12px;
                                border:2px solid #28a745;
                                margin:5px 0;
                                cursor:pointer;
                                border-radius:8px;
                                background:#f8fff8;
                                transition:all 0.2s;
                                font-weight:500;
                            " onmouseover="this.style.background='#e8f5e8';this.style.transform='scale(1.02)'" onmouseout="this.style.background='#f8fff8';this.style.transform='scale(1)'">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span><strong>${coupon.code}</strong> - ${discountText}</span>
                                    <span style="color:#666;font-size:0.9rem;">${dayText}</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    couponInput.placeholder = `No coupons available for ${dayType}`;
                    couponsDiv.style.display = 'block';
                    couponsDiv.innerHTML = `
                        <div style="background:#fff3cd;padding:10px;border-radius:5px;text-align:center;color:#856404;">
                            <strong>🎫 No coupons available for ${dayType.charAt(0).toUpperCase() + dayType.slice(1)}</strong><br>
                            <small>Try selecting a different date</small>
                        </div>
                    `;
                }
            }
            
            modal.style.display='block';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }else{
        showCriticalNotification('Please wait for page to load completely.', 'error');
    }
}

// Email OTP Variables
window.emailOtpCode = null;
window.emailVerified = false;

// Send Email OTP function
function sendEmailOTP() {
    const email = document.getElementById('email').value;
    const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showEmailOTPMessage('Please enter a valid email address', 'error');
        return;
    }
    
    sendEmailOtpBtn.disabled = true;
    sendEmailOtpBtn.textContent = 'Sending...';
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    window.emailOtpCode = otp;
    
    // Send OTP via server
    fetch('/api/send-email-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            email: email,
            otp: otp
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            document.getElementById('emailOtpGroup').style.display = 'block';
            showEmailOTPMessage('OTP sent to your email! Please check your inbox.', 'success');
            sendEmailOtpBtn.textContent = 'Resend OTP';
            sendEmailOtpBtn.disabled = false;
        } else {
            showEmailOTPMessage('Failed to send OTP: ' + (result.error || 'Unknown error'), 'error');
            sendEmailOtpBtn.textContent = 'Send Email OTP';
            sendEmailOtpBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Email OTP send error:', error);
        showEmailOTPMessage('Network error. Please try again.', 'error');
        sendEmailOtpBtn.textContent = 'Send Email OTP';
        sendEmailOtpBtn.disabled = false;
    });
}

// Verify Email OTP function
function verifyEmailOTP() {
    const enteredOtp = document.getElementById('emailOtpCode').value;
    const verifyEmailOtpBtn = document.getElementById('verifyEmailOtpBtn');
    
    if (!enteredOtp || enteredOtp.length !== 6) {
        showEmailOTPMessage('Please enter the 6-digit OTP', 'error');
        return;
    }
    
    if (!window.emailOtpCode) {
        showEmailOTPMessage('Please send OTP first', 'error');
        return;
    }
    
    // Immediate validation without delay
    if (enteredOtp !== window.emailOtpCode) {
        showEmailOTPMessage('Invalid OTP. Please try again.', 'error');
        return;
    }
    
    // Only show verifying for valid OTP
    verifyEmailOtpBtn.disabled = true;
    verifyEmailOtpBtn.textContent = 'Verifying...';
    
    // Quick success response
    setTimeout(() => {
        window.emailVerified = true;
        const emailInput = document.getElementById('email');
        emailInput.classList.add('email-verified');
        emailInput.readOnly = true;
        
        showEmailOTPMessage('Email verified successfully!', 'success');
        document.getElementById('emailOtpGroup').style.display = 'none';
        document.getElementById('sendEmailOtpBtn').style.display = 'none';
        
        // Enable booking button
        const bookBtn = document.querySelector('#bookingModal .book-btn');
        if (bookBtn) {
            bookBtn.disabled = false;
            bookBtn.textContent = 'Confirm Booking';
        }
        
        verifyEmailOtpBtn.textContent = 'Verify Email OTP';
        verifyEmailOtpBtn.disabled = false;
    }, 300);
}

// Show Email OTP message helper
function showEmailOTPMessage(message, type) {
    const otpMessage = document.getElementById('emailOtpMessage');
    if (otpMessage) {
        otpMessage.textContent = message;
        otpMessage.className = `otp-message otp-${type}`;
        setTimeout(() => {
            otpMessage.textContent = '';
            otpMessage.className = 'otp-message';
        }, 5000);
    }
}

// Handle booking form submission
window.handleBookingSubmit=async function(e){
    e.preventDefault();
    console.log('🎯 Booking form submitted');
    
    // Email verification removed - proceed directly
    console.log('✅ Proceeding with booking (email verification disabled)');
    
    const formData={
        resortId:document.getElementById('resortId').value,
        guestName:document.getElementById('guestName').value,
        email:document.getElementById('email').value,
        phone:document.getElementById('phone').value,
        checkIn:document.getElementById('checkIn').value,
        checkOut:document.getElementById('checkOut').value,
        guests:parseInt(document.getElementById('guests').value)||2
    };
    
    // Basic validation
    if(!formData.guestName||!formData.email||!formData.phone||!formData.checkIn||!formData.checkOut){
        showCriticalNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Phone validation
    if(!formData.phone.startsWith('+91')||formData.phone.length!==13){
        showCriticalNotification('Please enter a valid phone number with +91', 'error');
        return;
    }
    
    // Email validation
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)){
        showCriticalNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Date validation - prevent past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedCheckIn = new Date(formData.checkIn);
    const selectedCheckOut = new Date(formData.checkOut);
    
    if (selectedCheckIn < today) {
        showCriticalNotification('Check-in date cannot be in the past. Please select today or a future date.', 'error');
        return;
    }
    
    if (selectedCheckOut <= selectedCheckIn) {
        showCriticalNotification('Check-out date must be at least one day after check-in date.', 'error');
        return;
    }
    
    // Calculate total price for availability check
    const resort=window.resorts.find(r=>r.id==formData.resortId);
    if(!resort){
        console.log('❌ Resort not found for ID:', formData.resortId);
        showCriticalNotification('Resort not found', 'error');
        return;
    }
    
    const checkInDate=new Date(formData.checkIn);
    const checkOutDate=new Date(formData.checkOut);
    const nights=Math.max(1,Math.ceil((checkOutDate-checkInDate)/(1000*60*60*24)));
    
    // Apply dynamic pricing based on check-in date
    const checkInDayOfWeek = checkInDate.getDay();
    let nightlyRate = resort.price;
    
    if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
        if (checkInDayOfWeek === 5) {
            const fridayPrice = resort.dynamic_pricing.find(p => p.day_type === 'friday');
            if (fridayPrice) nightlyRate = fridayPrice.price;
        } else if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
            const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
            if (weekendPrice) nightlyRate = weekendPrice.price;
        } else {
            const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
            if (weekdayPrice) nightlyRate = weekdayPrice.price;
        }
    }
    
    const basePrice=nightlyRate*nights;
    const platformFee=Math.round(basePrice*0.015);
    const total=basePrice+platformFee;
    
    // Check availability with pricing validation before proceeding to payment
    try {
        const availabilityResponse = await fetch('/api/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resortId: formData.resortId,
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                expectedPrice: total
            })
        });
        
        if (!availabilityResponse.ok) {
            const error = await availabilityResponse.json();
            if (error.correctPrice) {
                showCriticalNotification(`Price has changed. Expected: ₹${error.correctPrice.toLocaleString()}. Please refresh and try again.`, 'error');
            } else {
                showCriticalNotification(error.error || 'Resort not available for selected dates', 'error');
            }
            return;
        }
    } catch (error) {
        showCriticalNotification('Failed to check availability. Please try again.', 'error');
        return;
    }
    
    // Create booking data for payment
    console.log('✅ Resort found:', resort.name);
    
    const bookingData = {
        ...formData,
        resortName: resort.name,
        resortNote: resort.note,
        basePrice: basePrice,
        platformFee: platformFee,
        totalPrice: total - (window.appliedDiscountAmount || 0),
        bookingReference: `VE${String(Date.now()).padStart(12, '0')}`,
        couponCode: window.appliedCouponCode || null,
        discountAmount: window.appliedDiscountAmount || 0
    };
    
    console.log('✅ Booking data prepared:', bookingData);
    
    // Don't close booking modal - update it to show payment
    updateBookingModalToPayment(bookingData);
}

// Enhanced payment interface with card payment
function showPaymentInterface(bookingData){
    const paymentModal=document.createElement('div');
    paymentModal.className='payment-modal';
    paymentModal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:200000;display:flex;align-items:center;justify-content:center;';
    paymentModal.innerHTML=`
        <div style="background:white;padding:20px;border-radius:10px;max-width:500px;width:90%;position:relative;max-height:90vh;overflow-y:auto;z-index:200001;">
            <span onclick="closePaymentModal(this)" style="position:absolute;top:10px;right:15px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
            <h2>💳 Complete Payment</h2>
            <div style="margin:15px 0;">
                <p><strong>Resort:</strong> ${bookingData.resortName.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}</p>
                <p><strong>Guest:</strong> ${bookingData.guestName.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}</p>
                <p><strong>Total:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                <p><strong>Reference:</strong> ${bookingData.bookingReference}</p>
            </div>
            ${bookingData.resortNote ? `<div class="payment-note" style="background:#f8f9fa;padding:10px;border-left:4px solid #007bff;margin:10px 0;border-radius:5px;"><strong>📝 Note:</strong> ${bookingData.resortNote}</div>` : ''}
            

            
            <div style="margin:20px 0;">
                <div style="display:flex;margin-bottom:15px;">
                    <button onclick="showCriticalPaymentMethod('upi')" id="upiTab" style="flex:1;padding:10px;border:2px solid #007bff;background:#007bff;color:white;border-radius:5px 0 0 5px;cursor:pointer;">🔗 UPI Payment</button>
                    <button onclick="showCriticalPaymentMethod('card')" id="cardTab" style="flex:1;padding:10px;border:2px solid #007bff;background:white;color:#007bff;border-radius:0 5px 5px 0;cursor:pointer;">💳 Card Payment</button>
                </div>
                
                <div id="upiPayment" style="display:block;">
                    <h3>🔗 UPI Payment</h3>
                    <div style="text-align:center;margin:15px 0;">
                        <img src="qr-code.png.jpeg" alt="UPI QR Code" style="max-width:200px;height:auto;border:1px solid #ddd;border-radius:8px;">
                    </div>
                    <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                    <p><strong>Amount:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                    <input type="text" placeholder="Enter 12-digit UTR" id="utrInput" maxlength="12" pattern="[0-9]{12}" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;">
                    <button onclick="confirmCriticalPayment()" style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;width:100%;margin:10px 0;">✅ Confirm UPI Payment</button>
                </div>
                
                <div id="cardPayment" style="display:none;">
                    <h3>💳 Card Payment</h3>
                    <p><strong>Base Amount:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                    <p><strong>Transaction Fee (1.5%):</strong> ₹${Math.round(bookingData.totalPrice*0.015).toLocaleString()}</p>
                    <p style="font-weight:bold;border-top:1px solid #ddd;padding-top:5px;margin-top:5px;"><strong>Total Card Payment:</strong> ₹${(bookingData.totalPrice+Math.round(bookingData.totalPrice*0.015)).toLocaleString()}</p>
                    <button onclick="payCriticalWithCard()" style="background:#6f42c1;color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;width:100%;margin:10px 0;">💳 Pay ₹${(bookingData.totalPrice+Math.round(bookingData.totalPrice*0.015)).toLocaleString()} with Card</button>
                </div>
            </div>
            
            <button onclick="closePaymentModal()" style="background:#dc3545;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;width:100%;">Cancel</button>
        </div>
    `;
    document.body.appendChild(paymentModal);
    
    // Payment modal close function
    window.closePaymentModal = function(element) {
        const modal = element ? element.closest('.payment-modal') : document.querySelector('.payment-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
        // Don't reopen booking modal
    };
    
    window.pendingCriticalBooking=bookingData;
    
    window.showCriticalPaymentMethod=function(method){
        document.getElementById('upiPayment').style.display=method==='upi'?'block':'none';
        document.getElementById('cardPayment').style.display=method==='card'?'block':'none';
        document.getElementById('upiTab').style.background=method==='upi'?'#007bff':'white';
        document.getElementById('upiTab').style.color=method==='upi'?'white':'#007bff';
        document.getElementById('cardTab').style.background=method==='card'?'#007bff':'white';
        document.getElementById('cardTab').style.color=method==='card'?'white':'#007bff';
    }
    
    window.confirmCriticalPayment=function(){
        console.log('💳 Payment confirmation started');
        const utr=document.getElementById('utrInput').value;
        if(!utr){
            console.log('❌ No UTR entered');
            showCriticalNotification('Please enter your 12-digit UTR number', 'error');
            return;
        }
        if(!/^[0-9]{12}$/.test(utr)){
            console.log('❌ Invalid UTR format:', utr);
            showCriticalNotification('UTR number must be exactly 12 digits', 'error');
            return;
        }
        console.log('✅ UTR validated:', utr);
        
        const btn=document.querySelector('[onclick="confirmCriticalPayment()"]');
        const originalText=btn.textContent;
        btn.textContent='Processing...';
        btn.disabled=true;
        const sanitizeInput=s=>s?String(s).replace(/[<>"'&\/]/g,''):'';
        fetch('/api/bookings',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'X-Requested-With':'XMLHttpRequest',
                'X-CSRF-Token':getCSRFToken()
            },
            body:JSON.stringify({
                resortId:parseInt(bookingData.resortId)||0,
                guestName:sanitizeInput(bookingData.guestName).substring(0,100),
                email:sanitizeInput(bookingData.email).substring(0,100),
                phone:sanitizeInput(bookingData.phone).substring(0,20),
                checkIn:sanitizeInput(bookingData.checkIn).substring(0,10),
                checkOut:sanitizeInput(bookingData.checkOut).substring(0,10),
                guests:Math.max(1,Math.min(20,parseInt(bookingData.guests)||2)),
                transactionId:sanitizeInput(utr).substring(0,50),
                couponCode: bookingData.couponCode || null,
                discountAmount: bookingData.discountAmount || 0
            })
        }).then(r=>{
            console.log('📶 Booking API response status:', r.status);
            return r.json();
        }).then(result=>{
            console.log('📶 Booking API result:', result);
            if(result.error){
                console.log('❌ Booking failed:', result.error);
                showCriticalNotification('Booking failed: '+result.error, 'error');
            }else{
                console.log('✅ Booking successful:', result);
                showCriticalNotification('Payment submitted for verification. You will be notified via email and WhatsApp.', 'success');
                paymentModal.remove();
                window.pendingCriticalBooking=null;
            }
        }).catch(e=>{
            console.error('❌ Network error:', e);
            showCriticalNotification('Network error. Please try again.', 'error');
        }).finally(()=>{
            btn.textContent=originalText;
            btn.disabled=false;
        });
    }
    
    window.payCriticalWithCard=function(){
        if(typeof Razorpay==='undefined'){
            const script=document.createElement('script');
            script.src='https://checkout.razorpay.com/v1/checkout.js';
            script.onload=function(){setTimeout(window.payCriticalWithCard,500)};
            script.onerror=function(){showCriticalNotification('Card payment service unavailable. Please use UPI.', 'error')};
            document.head.appendChild(script);
            return;
        }
        
        const cardAmount=bookingData.totalPrice+Math.round(bookingData.totalPrice*0.015);
        const sanitizeInput=s=>s?String(s).replace(/[<>"'&\/]/g,''):'';
        
        fetch('/api/bookings',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'X-Requested-With':'XMLHttpRequest',
                'X-CSRF-Token':getCSRFToken()
            },
            body:JSON.stringify({
                resortId:parseInt(bookingData.resortId)||0,
                guestName:sanitizeInput(bookingData.guestName).substring(0,100),
                email:sanitizeInput(bookingData.email).substring(0,100),
                phone:sanitizeInput(bookingData.phone).substring(0,20),
                checkIn:sanitizeInput(bookingData.checkIn).substring(0,10),
                checkOut:sanitizeInput(bookingData.checkOut).substring(0,10),
                guests:Math.max(1,Math.min(20,parseInt(bookingData.guests)||2))
            })
        }).then(r=>r.json()).then(booking=>{
            if(booking.error){
                showCriticalNotification('Booking failed: '+booking.error, 'error');
                return;
            }
            fetch('/api/razorpay-key').then(r=>r.json()).then(keyData=>{
                if(!keyData.key){
                    showCriticalNotification('Payment system not configured. Please use UPI.', 'error');
                    return;
                }
                const options={
                    key:keyData.key,
                    amount:cardAmount*100,
                    currency:'INR',
                    name:'Vizag Resorts',
                    description:'Resort Booking Payment',
                    handler:function(response){
                        fetch(`/api/bookings/${booking.id}/notify-card-payment`,{
                            method:'POST',
                            headers:{
                                'Content-Type':'application/json',
                                'X-Requested-With':'XMLHttpRequest'
                            },
                            body:JSON.stringify({paymentId:response.razorpay_payment_id})
                        }).catch(e=>console.log('Notification failed'));
                        showCriticalNotification('Card payment successful! You will be notified via email and WhatsApp.', 'success');
                        paymentModal.remove();
                        window.pendingCriticalBooking=null;
                    },
                    prefill:{
                        name:bookingData.guestName,
                        email:bookingData.email,
                        contact:bookingData.phone
                    },
                    theme:{color:'#667eea'},
                    modal:{
                        ondismiss:function(){
                            console.log('Payment cancelled');
                        }
                    }
                };
                const rzp=new Razorpay(options);
                rzp.open();
            }).catch(e=>showCriticalNotification('Payment configuration error. Please use UPI.', 'error'));
        }).catch(e=>showCriticalNotification('Booking creation failed. Please try again.', 'error'));
    }
}

// Fallback for script.js
window.openBookingModal=function(resortId){
    const resort=window.resorts?.find(r=>r.id==resortId);
    if(resort)bookNow(resortId,resort.name);
}

// Gallery functionality with multiple images
function openGallery(resortId){
    console.log('🖼️ Opening gallery for resort:', resortId);
    const resort=window.resorts?.find(r=>r.id==resortId);
    if(!resort){
        console.error('Resort not found:', resortId);
        return;
    }
    
    let galleryItems=[];
    if(resort.image)galleryItems.push({type:'image',src:resort.image});
    if(resort.gallery){
        resort.gallery.split('\n').filter(img=>img.trim()).forEach(img=>{
            galleryItems.push({type:'image',src:img.trim()});
        });
    }
    if(resort.videos){
        resort.videos.split('\n').filter(vid=>vid.trim()).forEach(vid=>{
            galleryItems.push({type:'video',src:vid.trim()});
        });
    }
    if(galleryItems.length===0){
        galleryItems=[{type:'image',src:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800'}];
    }
    
    const existingModal=document.getElementById('resortGalleryModal');
    if(existingModal)existingModal.remove();
    
    let currentIndex=0;
    
    const galleryModal=document.createElement('div');
    galleryModal.id='resortGalleryModal';
    galleryModal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
    
    function updateModal(){
        galleryModal.innerHTML=`
            <div style="background:white;padding:20px;border-radius:10px;max-width:90%;max-height:90%;overflow-y:auto;position:relative;">
                <span onclick="closeResortGallery()" style="position:absolute;top:10px;right:15px;font-size:28px;cursor:pointer;color:#999;z-index:10001;">&times;</span>
                <h2 style="margin-bottom:20px;color:#333;">${resort.name}</h2>
                <div style="text-align:center;margin-bottom:20px;position:relative;">
                    ${galleryItems[currentIndex].type==='video'?
                        `<video controls style="width:100%;height:70vh;object-fit:contain;border-radius:8px;" src="${galleryItems[currentIndex].src.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}" title="${resort.name} resort video - ${resort.location}, Vizag"></video>`:
                        `<img src="${galleryItems[currentIndex].src.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}" alt="${resort.name} - Best resorts in Vizag ${resort.location} with private pool, swimming pool. Top vizag resorts near beach for family vacation" title="${resort.name} Gallery - Best resort in Vizag with private pool | Nearby resorts ${resort.location}" style="width:100%;height:70vh;object-fit:contain;border-radius:8px;">`
                    }
                    ${galleryItems.length>1?`
                        <button onclick="prevImage()" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:white;border:none;padding:10px 15px;border-radius:50%;cursor:pointer;font-size:18px;">&lt;</button>
                        <button onclick="nextImage()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:white;border:none;padding:10px 15px;border-radius:50%;cursor:pointer;font-size:18px;">&gt;</button>
                    `:''}
                </div>
                ${galleryItems.length>1?`
                    <div style="display:flex;gap:10px;margin-bottom:20px;overflow-x:auto;padding:10px 0;justify-content:center;">
                        ${galleryItems.map((item,i)=>{
                            if(item.type==='video'){
                                return `<div onclick="setImage(${i})" style="width:80px;height:60px;background:#000;border-radius:6px;cursor:pointer;opacity:${i===currentIndex?'1':'0.6'};border:2px solid ${i===currentIndex?'#28a745':'transparent'};transition:all 0.3s;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;">▶️</div>`;
                            }else{
                                return `<img src="${item.src.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}" alt="${resort.name} - Best vizag resorts ${resort.location} with private pool, nearby resorts for weekend stay" title="${resort.name} - Top resort in Vizag with private pool" onclick="setImage(${i})" style="width:80px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;opacity:${i===currentIndex?'1':'0.6'};border:2px solid ${i===currentIndex?'#28a745':'transparent'};transition:all 0.3s;">`;
                            }
                        }).join('')}
                    </div>
                `:''}
                <div style="background:#f8f9fa;padding:15px;border-radius:8px;">
                    <p><strong>Location:</strong> ${resort.location}</p>
                    <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
                    <p><strong>Description:</strong> ${resort.description}</p>
                    <p style="margin-top:10px;color:#666;font-size:0.9rem;">${galleryItems[currentIndex].type==='video'?'Video':'Image'} ${currentIndex+1} of ${galleryItems.length}</p>
                </div>
            </div>
        `;
    }
    
    window.nextImage=function(){currentIndex=(currentIndex+1)%galleryItems.length;updateModal()};
    window.prevImage=function(){currentIndex=currentIndex===0?galleryItems.length-1:currentIndex-1;updateModal()};
    window.setImage=function(i){currentIndex=i;updateModal()};
    
    updateModal();
    document.body.appendChild(galleryModal);
    document.body.style.overflow='hidden';
    
    galleryModal.addEventListener('click',function(e){
        if(e.target===galleryModal)closeResortGallery();
    });
}

function closeResortGallery(){
    const modal=document.getElementById('resortGalleryModal');
    if(modal){
        modal.remove();
        document.body.style.overflow='auto';
    }
}

// Review modal close functions
window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow='auto';
    }
};

window.closeViewReviewsModal = function() {
    const modal = document.getElementById('viewReviewsModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow='auto';
    }
};

// Make functions globally accessible
window.openGallery=openGallery;
window.closeResortGallery=closeResortGallery;
window.closeGallery=closeResortGallery;

// Description toggle functionality
window.toggleDescription=function(resortId){
    const shortDesc=document.getElementById(`desc-short-${resortId}`);
    const fullDesc=document.getElementById(`desc-full-${resortId}`);
    const button=event.target;
    
    if(shortDesc.style.display==='none'){
        shortDesc.style.display='block';
        fullDesc.style.display='none';
        button.textContent='View More';
    }else{
        shortDesc.style.display='none';
        fullDesc.style.display='block';
        button.textContent='View Less';
    }
}

// Add logo animation CSS for all pages
const logoAnimationCSS=document.createElement('style');
logoAnimationCSS.textContent=`
.logo-image.rotating{transform:rotate(360deg)}
.logo-image.auto-rotate{animation:logoAutoRotate 1s ease-in-out}
@keyframes logoAutoRotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
`;
document.head.appendChild(logoAnimationCSS);

// Setup logo rotation for all pages
function setupLogoRotation(){
    const logo=document.querySelector('.logo-image');
    if(logo){
        logo.addEventListener('click',function(){
            this.classList.add('rotating');
            setTimeout(()=>this.classList.remove('rotating'),600);
        });
        setInterval(()=>{
            logo.classList.add('auto-rotate');
            setTimeout(()=>logo.classList.remove('auto-rotate'),1000);
        },15000);
    }
}
setupLogoRotation();

// Setup Redis real-time sync for main website
function setupMainWebsiteRedisSync() {
    console.log('📡 Redis real-time sync enabled for main website');
    
    let eventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    function connectEventSource() {
        try {
            eventSource = new EventSource('/api/events');
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Main website Redis event received:', data);
                    
                    // Handle all resort-related events
                    if (data.type && data.type.startsWith('resort.')) {
                        console.log('🏨 Resort event detected:', data.type, '- reloading resorts!');
                        // Force reload resorts with cache-busting
                        fetch('/api/resorts?' + Date.now(), {
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                'Content-Type': 'application/json',
                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                'Pragma': 'no-cache',
                                'Expires': '0'
                            }
                        })
                        .then(r => {
                            console.log('🏨 Resort API response status:', r.status);
                            if (!r.ok) throw new Error(`HTTP ${r.status}`);
                            return r.json();
                        })
                        .then(resorts => {
                            console.log('✅ Resorts reloaded, updating display with', resorts.length, 'resorts');
                            window.resorts = resorts;
                            renderResorts(resorts);
                        })
                        .catch(e => console.error('❌ Resort reload failed:', e));
                    }
                    
                    // Handle coupon-related events
                    if (data.type && data.type.startsWith('coupon.')) {
                        console.log('🎫 Coupon event detected:', data.type, '- reloading coupons!');
                        // Reload coupons in offers section
                        if (typeof loadOffersCoupons === 'function') {
                            loadOffersCoupons();
                        }
                    }
                } catch (error) {
                    // Ignore ping messages
                }
            };
            
            eventSource.onerror = function(error) {
                console.log('⚠️ Main website Redis connection error, attempting reconnect...');
                eventSource.close();
                
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectEventSource, 2000 * reconnectAttempts);
                } else {
                    console.log('❌ Max reconnection attempts reached');
                }
            };
            
            eventSource.onopen = function() {
                console.log('✅ Main website connected to Redis pub/sub');
                reconnectAttempts = 0;
            };
        } catch (error) {
            console.error('Main website Redis setup failed:', error);
        }
    }
    
    connectEventSource();
}

// Start Redis sync immediately
setupMainWebsiteRedisSync();

// Load main script immediately
const script=document.createElement('script');
script.src='script.js?v=1.0.5';
document.head.appendChild(script);

// Preload Razorpay for card payments
window.loadRazorpay=function(){
    if(typeof Razorpay==='undefined'){
        const razorScript=document.createElement('script');
        razorScript.src='https://checkout.razorpay.com/v1/checkout.js';
        razorScript.async=true;
        razorScript.onerror=()=>console.log('Razorpay failed to load');
        document.head.appendChild(razorScript);
    }
};

// Load Razorpay immediately
window.loadRazorpay();

// Review system functions
window.openReviewModal = function(resortId, resortName) {
    const modal = document.createElement('div');
    modal.id = 'reviewModal';
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    modal.innerHTML = `
        <div class="modal-content" style="background:white;padding:30px;border-radius:10px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;position:relative;">
            <span class="close" onclick="closeReviewModal()" style="position:absolute;top:15px;right:20px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
            <h2>Write a Review for ${resortName}</h2>
            <form id="reviewForm" onsubmit="submitReview(event, ${resortId})">
                <div class="form-group" style="margin-bottom:15px;">
                    <label for="reviewGuestName">Full Name:</label>
                    <input type="text" id="reviewGuestName" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;margin-top:5px;">
                </div>
                
                <div class="form-group" style="margin-bottom:15px;">
                    <label for="reviewPhone">Phone Number:</label>
                    <input type="tel" id="reviewPhone" placeholder="Enter 10 digits number" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;margin-top:5px;">
                </div>
                
                <div class="form-group" style="margin-bottom:15px;">
                    <label for="reviewBookingId">Booking ID:</label>
                    <input type="text" id="reviewBookingId" placeholder="Enter your booking reference" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;margin-top:5px;">
                    <small style="color:#666;font-size:0.9rem;">Enter your booking reference (e.g., VE123456789012)</small>
                </div>
                
                <div class="form-group" style="margin-bottom:15px;">
                    <label>Rating:</label>
                    <div class="star-rating" style="margin-top:5px;">
                        <span class="star" data-rating="1" onclick="setRating(1)">⭐</span>
                        <span class="star" data-rating="2" onclick="setRating(2)">⭐</span>
                        <span class="star" data-rating="3" onclick="setRating(3)">⭐</span>
                        <span class="star" data-rating="4" onclick="setRating(4)">⭐</span>
                        <span class="star" data-rating="5" onclick="setRating(5)">⭐</span>
                    </div>
                    <input type="hidden" id="reviewRating" required>
                </div>
                
                <div class="form-group" style="margin-bottom:20px;">
                    <label for="reviewText">Your Review:</label>
                    <textarea id="reviewText" rows="4" required placeholder="Share your experience..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;margin-top:5px;resize:vertical;"></textarea>
                </div>
                
                <button type="submit" style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;width:100%;font-size:16px;">Submit Review</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup phone input formatting
    const phoneInput = document.getElementById('reviewPhone');
    phoneInput.addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '');
        if (val.length > 10) val = val.substring(0, 10);
        this.value = val;
    });
};

window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.remove();
};

window.setRating = function(rating) {
    document.getElementById('reviewRating').value = rating;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#ffc107';
            star.style.fontSize = '24px';
        } else {
            star.style.color = '#ddd';
            star.style.fontSize = '20px';
        }
    });
};

window.submitReview = async function(event, resortId) {
    event.preventDefault();
    
    const formData = {
        bookingId: document.getElementById('reviewBookingId').value.trim(),
        guestName: document.getElementById('reviewGuestName').value.trim(),
        phone: document.getElementById('reviewPhone').value.trim(),
        rating: parseInt(document.getElementById('reviewRating').value),
        reviewText: document.getElementById('reviewText').value.trim()
    };
    
    if (!formData.rating) {
        showCriticalNotification('Please select a rating', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Validating...';
    
    try {
        // First validate booking
        const validateResponse = await fetch('/api/validate-booking-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingId: formData.bookingId,
                phone: formData.phone
            })
        });
        
        const validateResult = await validateResponse.json();
        
        if (!validateResult.valid) {
            showCriticalNotification(validateResult.error, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
            return;
        }
        
        submitBtn.textContent = 'Submitting...';
        
        // Submit review
        const reviewResponse = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const reviewResult = await reviewResponse.json();
        
        if (reviewResult.success) {
            showCriticalNotification('Review submitted successfully! Thank you for your feedback.', 'success');
            closeReviewModal();
        } else {
            showCriticalNotification(reviewResult.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        showCriticalNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
};

window.viewReviews = async function(resortId, resortName) {
    try {
        const response = await fetch(`/api/reviews/${resortId}`);
        const reviews = await response.json();
        
        const modal = document.createElement('div');
        modal.id = 'viewReviewsModal';
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        
        const reviewsHTML = reviews.length > 0 ? reviews.map(review => {
            const stars = '⭐'.repeat(review.rating);
            const date = new Date(review.created_at).toLocaleDateString('en-IN');
            return `
                <div style="border-bottom:1px solid #eee;padding:15px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <strong>${review.guest_name}</strong>
                        <span style="color:#666;font-size:0.9rem;">${date}</span>
                    </div>
                    <div style="margin-bottom:8px;">${stars} (${review.rating}/5)</div>
                    <p style="color:#555;line-height:1.4;">${review.review_text}</p>
                </div>
            `;
        }).join('') : '<p style="text-align:center;color:#666;padding:20px;">No reviews yet. Be the first to review!</p>';
        
        modal.innerHTML = `
            <div class="modal-content" style="background:white;padding:30px;border-radius:10px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;position:relative;">
                <span class="close" onclick="closeViewReviewsModal()" style="position:absolute;top:15px;right:20px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
                <h2>Reviews for ${resortName}</h2>
                <div style="margin-top:20px;">
                    ${reviewsHTML}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        showCriticalNotification('Failed to load reviews', 'error');
    }
};

window.closeViewReviewsModal = function() {
    const modal = document.getElementById('viewReviewsModal');
    if (modal) modal.remove();
};

// Enhanced notification system
function showCriticalNotification(message, type = 'success') {
    const isBookingConfirmation = message.includes('submitted for verification') || message.includes('successful');
    
    const notification = document.createElement('div');
    
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
            z-index: 300000;
            box-shadow: 0 10px 30px rgba(40, 167, 69, 0.3);
            font-size: 16px;
            max-width: 400px;
            text-align: center;
            animation: bookingPulse 0.6s ease-out;
            border: 3px solid #fff;
        `;
    } else if (type === 'error') {
        notification.innerHTML = `
            <div class="notification-content">
                <div class="error-icon">❌</div>
                <div class="notification-text">
                    <strong>Error!</strong><br>
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
            z-index: 300000;
            box-shadow: 0 10px 30px rgba(220, 53, 69, 0.3);
            font-size: 16px;
            max-width: 400px;
            text-align: center;
            animation: errorShake 0.6s ease-out;
            border: 3px solid #fff;
        `;
    } else {
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 300000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
        `;
    }
    
    document.body.appendChild(notification);
    
    if ((isBookingConfirmation || type === 'error') && !document.getElementById('critical-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'critical-animation-styles';
        style.textContent = `
            @keyframes bookingPulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            @keyframes errorShake {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                25% { transform: translate(-50%, -50%) scale(1.05) translateX(-5px); }
                50% { transform: translate(-50%, -50%) scale(1) translateX(5px); }
                75% { transform: translate(-50%, -50%) scale(1) translateX(-3px); }
                100% { transform: translate(-50%, -50%) scale(1) translateX(0); opacity: 1; }
            }
            .success-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: bounce 1s infinite alternate;
            }
            .error-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: pulse 1s infinite alternate;
            }
            @keyframes bounce {
                0% { transform: translateY(0); }
                100% { transform: translateY(-10px); }
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                100% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    const duration = (isBookingConfirmation || type === 'error') ? 6000 : 4000;
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Update booking modal to show payment instead of new popup
function updateBookingModalToPayment(bookingData) {
    const modal = document.getElementById('bookingModal');
    const modalCard = modal.querySelector('.vrb-modal-card');
    
    modalCard.innerHTML = `
        <button class="vrb-close" onclick="closeBookingModal()">✕</button>
        <div class="vrb-modal-head">
            <h2>💳 Complete Payment</h2>
            <p>Secure booking with instant confirmation</p>
        </div>
        <div style="margin:15px 0;">
            <p><strong>Resort:</strong> ${bookingData.resortName}</p>
            <p><strong>Guest:</strong> ${bookingData.guestName}</p>
            <p><strong>Total:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
            <p><strong>Reference:</strong> ${bookingData.bookingReference}</p>
        </div>
        ${bookingData.resortNote ? `<div class="payment-note" style="background:#f8f9fa;padding:10px;border-left:4px solid #007bff;margin:10px 0;border-radius:5px;"><strong>📝 Note:</strong> ${bookingData.resortNote}</div>` : ''}
        
        <div style="margin:20px 0;">
            <div style="display:flex;margin-bottom:15px;">
                <button onclick="showPaymentMethod('upi')" id="upiTab" style="flex:1;padding:10px;border:2px solid #007bff;background:#007bff;color:white;border-radius:5px 0 0 5px;cursor:pointer;">🔗 UPI Payment</button>
                <button onclick="showPaymentMethod('card')" id="cardTab" style="flex:1;padding:10px;border:2px solid #007bff;background:white;color:#007bff;border-radius:0 5px 5px 0;cursor:pointer;">💳 Card Payment</button>
            </div>
            
            <div id="upiPayment" style="display:block;">
                <h3>🔗 UPI Payment</h3>
                <div style="text-align:center;margin:15px 0;">
                    <img src="qr-code.png.jpeg" alt="UPI QR Code" style="max-width:200px;height:auto;border:1px solid #ddd;border-radius:8px;">
                </div>
                <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                <p><strong>Amount:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                <input type="text" placeholder="Enter 12-digit UTR" id="utrInput" maxlength="12" pattern="[0-9]{12}" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;">
                <button onclick="confirmPayment()" style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;width:100%;margin:10px 0;">✅ Confirm UPI Payment</button>
            </div>
            
            <div id="cardPayment" style="display:none;">
                <h3>💳 Card Payment</h3>
                <p><strong>Base Amount:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                <p><strong>Transaction Fee (1.5%):</strong> ₹${Math.round(bookingData.totalPrice*0.015).toLocaleString()}</p>
                <p style="font-weight:bold;border-top:1px solid #ddd;padding-top:5px;margin-top:5px;"><strong>Total Card Payment:</strong> ₹${(bookingData.totalPrice+Math.round(bookingData.totalPrice*0.015)).toLocaleString()}</p>
                <button onclick="payWithCard()" style="background:#6f42c1;color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;width:100%;margin:10px 0;">💳 Pay ₹${(bookingData.totalPrice+Math.round(bookingData.totalPrice*0.015)).toLocaleString()} with Card</button>
            </div>
        </div>
        
        <button onclick="closeBookingModal()" style="background:#dc3545;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;width:100%;">Cancel</button>
    `;
    
    window.pendingBooking = bookingData;
    
    window.showPaymentMethod = function(method) {
        document.getElementById('upiPayment').style.display = method === 'upi' ? 'block' : 'none';
        document.getElementById('cardPayment').style.display = method === 'card' ? 'block' : 'none';
        document.getElementById('upiTab').style.background = method === 'upi' ? '#007bff' : 'white';
        document.getElementById('upiTab').style.color = method === 'upi' ? 'white' : '#007bff';
        document.getElementById('cardTab').style.background = method === 'card' ? '#007bff' : 'white';
        document.getElementById('cardTab').style.color = method === 'card' ? 'white' : '#007bff';
    };
    
    window.confirmPayment = function() {
        const utr = document.getElementById('utrInput').value;
        if (!utr) {
            showCriticalNotification('Please enter your 12-digit UTR number', 'error');
            return;
        }
        if (!/^[0-9]{12}$/.test(utr)) {
            showCriticalNotification('UTR number must be exactly 12 digits', 'error');
            return;
        }
        
        const btn = document.querySelector('[onclick="confirmPayment()"]');
        btn.textContent = 'Processing...';
        btn.disabled = true;
        
        fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': getCSRFToken()
            },
            body: JSON.stringify({
                resortId: parseInt(bookingData.resortId) || 0,
                guestName: bookingData.guestName,
                email: bookingData.email,
                phone: bookingData.phone,
                checkIn: bookingData.checkIn,
                checkOut: bookingData.checkOut,
                guests: bookingData.guests,
                transactionId: utr,
                couponCode: bookingData.couponCode || null,
                discountAmount: bookingData.discountAmount || 0
            })
        }).then(r => r.json()).then(result => {
            if (result.error) {
                showCriticalNotification('Booking failed: ' + result.error, 'error');
            } else {
                showCriticalNotification('Payment submitted for verification. You will be notified via email and WhatsApp.', 'success');
                closeBookingModal();
            }
        }).catch(e => {
            showCriticalNotification('Network error. Please try again.', 'error');
        }).finally(() => {
            btn.textContent = '✅ Confirm UPI Payment';
            btn.disabled = false;
        });
    };
    
    window.payWithCard = function() {
        // Card payment logic here - similar to existing implementation
        if(typeof Razorpay==='undefined'){
            const script=document.createElement('script');
            script.src='https://checkout.razorpay.com/v1/checkout.js';
            script.onload=function(){setTimeout(window.payWithCard,500)};
            script.onerror=function(){showCriticalNotification('Card payment service unavailable. Please use UPI.', 'error')};
            document.head.appendChild(script);
            return;
        }
        
        const cardAmount=window.pendingBooking.totalPrice+Math.round(window.pendingBooking.totalPrice*0.015);
        
        fetch('/api/bookings',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'X-Requested-With':'XMLHttpRequest',
                'X-CSRF-Token':getCSRFToken()
            },
            body:JSON.stringify({
                resortId:parseInt(window.pendingBooking.resortId)||0,
                guestName:window.pendingBooking.guestName,
                email:window.pendingBooking.email,
                phone:window.pendingBooking.phone,
                checkIn:window.pendingBooking.checkIn,
                checkOut:window.pendingBooking.checkOut,
                guests:window.pendingBooking.guests,
                couponCode: window.pendingBooking.couponCode || null,
                discountAmount: window.pendingBooking.discountAmount || 0
            })
        }).then(r=>r.json()).then(booking=>{
            if(booking.error){
                showCriticalNotification('Booking failed: '+booking.error, 'error');
                return;
            }
            fetch('/api/razorpay-key').then(r=>r.json()).then(keyData=>{
                if(!keyData.key){
                    showCriticalNotification('Payment system not configured. Please use UPI.', 'error');
                    return;
                }
                const options={
                    key:keyData.key,
                    amount:cardAmount*100,
                    currency:'INR',
                    name:'Vizag Resorts',
                    description:'Resort Booking Payment',
                    handler:function(response){
                        showCriticalNotification('Card payment successful! You will be notified via email and WhatsApp.', 'success');
                        closeBookingModal();
                    },
                    prefill:{
                        name:window.pendingBooking.guestName,
                        email:window.pendingBooking.email,
                        contact:window.pendingBooking.phone
                    },
                    theme:{color:'#667eea'},
                    modal:{
                        ondismiss:function(){
                            console.log('Payment cancelled');
                        }
                    }
                };
                const rzp=new Razorpay(options);
                rzp.open();
            }).catch(e=>showCriticalNotification('Payment configuration error. Please use UPI.', 'error'));
        }).catch(e=>showCriticalNotification('Booking creation failed. Please try again.', 'error'));
    };
}
// ✅ Enhanced Hero search functionality with proper reset
document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.querySelector('.vrb-search-box .vrb-btn-orange');
    const locationSelect = document.getElementById('locationSelect');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (!locationSelect) {
                showCriticalNotification('Location selector not found', 'error');
                return;
            }
            
            const selectedValue = locationSelect.value;
            const selectedText = locationSelect.options[locationSelect.selectedIndex].text;
            
            console.log('🔍 Hero search clicked - Value:', selectedValue, 'Text:', selectedText);
            
            // Handle "All Locations" selection
            if (!selectedValue || selectedValue === 'All Locations' || selectedText === 'All Locations') {
                console.log('📍 Showing all resorts');
                if (window.resorts) {
                    renderResorts(window.resorts);
                    document.getElementById('resorts').scrollIntoView({ behavior: 'smooth' });
                    showCriticalNotification(`Showing all ${window.resorts.length} resorts`, 'success');
                }
                return;
            }
            
            // Filter resorts by selected location
            if (window.resorts) {
                const filteredResorts = window.resorts.filter(resort => 
                    resort.location && resort.location.trim().toLowerCase() === selectedValue.toLowerCase()
                );
                
                console.log('📍 Filtered resorts:', filteredResorts.length, 'for location:', selectedValue);
                
                if (filteredResorts.length === 0) {
                    showCriticalNotification(`No resorts found in ${selectedValue}`, 'error');
                    return;
                }
                
                // Filter resorts by selected location
                renderResorts(filteredResorts);
                
                // Scroll to resorts section
                document.getElementById('resorts').scrollIntoView({ behavior: 'smooth' });
                
                showCriticalNotification(`Found ${filteredResorts.length} resorts in ${selectedValue}`, 'success');
                
                // ✅ REMOVED: No auto-reset - keep selected location
            } else {
                showCriticalNotification('Please wait for resorts to load', 'error');
            }
        });
    }
    

    
    // ✅ Initialize premium chat widget
    initializePremiumChatWidget();
});



// ✅ Premium Chat Widget Integration with MCP Server
function initializePremiumChatWidget() {
    const chatFab = document.getElementById('vrbChatFab');
    const chatBox = document.getElementById('vrbChatBox');
    const chatClose = document.getElementById('vrbChatClose');
    const chatSend = document.getElementById('vrbChatSend');
    const chatInput = document.getElementById('vrbChatInput');
    const chatBody = document.getElementById('vrbChatBody');
    
    if (!chatFab || !chatBox) return;
    
    let isOpen = false;
    let sessionId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    
    // Toggle chat
    chatFab.addEventListener('click', () => {
        isOpen = !isOpen;
        chatBox.classList.toggle('open', isOpen);
        
        // Add tool buttons when chat opens if they don't exist
        if (isOpen && !chatBody.querySelector('.vrb-chat-tools')) {
            setTimeout(() => addToolButtons(), 100);
        }
    });
    
    // Close chat
    if (chatClose) {
        chatClose.addEventListener('click', () => {
            isOpen = false;
            chatBox.classList.remove('open');
        });
    }
    
    // Send message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';
        
        try {
            // Send to your MCP server
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: message
                })
            });
            
            const data = await response.json();
            const botResponse = data.answer || 'Sorry, I could not process your request.';
            
            // Check for human handover
            if (data.handover === true) {
                startHumanChat(sessionId);
                return;
            }
            
            addMessage(botResponse, 'bot');
            
            // Always show resort buttons after any bot response in availability flow
            if (message === 'Check resort availability') {
                setTimeout(() => addResortSelectionButtons(), 1000);
            }
            
        } catch (error) {
            console.error('Chat error:', error);
            addMessage('❌ Unable to connect to support. Please try again later.', 'bot');
        }
    }
    
    // Add message to chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `vrb-msg vrb-${sender}`;
        
        // Sanitize text to prevent XSS
        const sanitizedText = text.replace(/[<>"'&]/g, function(match) {
            const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
            return map[match];
        });
        
        if (sender === 'bot') {
            messageDiv.innerHTML = `
                <div class="bot-avatar">🤖</div>
                <div class="msg-content">${sanitizedText}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="msg-content">${sanitizedText}</div>
            `;
        }
        
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // Add tool buttons after welcome message (but only if not already added)
        if (sender === 'bot' && text.includes('Welcome to Vizag Resort Booking!') && !chatBody.querySelector('.vrb-chat-tools')) {
            setTimeout(() => addToolButtons(), 100);
        }
    }
    
    // Add tool buttons after welcome message
    function addToolButtons() {
        const toolButtonsDiv = document.createElement('div');
        toolButtonsDiv.className = 'vrb-msg vrb-bot';
        toolButtonsDiv.innerHTML = `
            <div class="bot-avatar">🤖</div>
            <div class="msg-content">
                <div class="vrb-chat-tools">
                    <button class="mcp-tool-btn" data-tool="refund">💰 Refund Policy</button>
                    <button class="mcp-tool-btn" data-tool="checkin">🏨 Check-in Info</button>
                    <button class="mcp-tool-btn" data-tool="rules">📋 Resort Rules</button>
                    <button class="mcp-tool-btn" data-tool="availability">📅 Check Availability</button>
                    <button class="mcp-tool-btn" data-tool="coupons">🎫 Active Coupons</button>
                    <button class="mcp-tool-btn" data-tool="human">👩💼 Talk to Human</button>
                </div>
            </div>
        `;
        chatBody.appendChild(toolButtonsDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    // Add resort selection buttons
    function addResortSelectionButtons() {
        if (!window.resorts || window.resorts.length === 0) return;
        
        const resortButtonsDiv = document.createElement('div');
        resortButtonsDiv.className = 'vrb-msg vrb-bot';
        
        const resortButtons = window.resorts.slice(0, 5).map(resort => 
            `<button class="resort-select-btn" data-resort="${resort.name}">${resort.name}</button>`
        ).join('');
        
        resortButtonsDiv.innerHTML = `
            <div class="bot-avatar">🤖</div>
            <div class="msg-content">
                <div class="resort-buttons">
                    ${resortButtons}
                </div>
            </div>
        `;
        
        chatBody.appendChild(resortButtonsDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    // Send button click
    if (chatSend) {
        chatSend.addEventListener('click', sendMessage);
    }
    
    // Enter key to send
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // MCP tool buttons - use event delegation for dynamically added buttons
    chatBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('mcp-tool-btn')) {
            const tool = e.target.getAttribute('data-tool');
            let message = '';
            
            switch(tool) {
                case 'refund':
                    message = 'What is your refund policy?';
                    break;
                case 'checkin':
                    message = 'Tell me about check-in and check-out';
                    break;
                case 'rules':
                    message = 'What are the resort rules?';
                    break;
                case 'availability':
                    message = 'Check resort availability';
                    break;
                case 'coupons':
                    message = 'Show me active coupons';
                    break;
                case 'human':
                    // Handle human agent request
                    addMessage('👩💼 Connecting you to a human agent...', 'bot');
                    
                    try {
                        const response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                session_id: sessionId,
                                message: '__HUMAN__'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.handover === true) {
                            startHumanChat(sessionId);
                        } else {
                            addMessage('❌ Unable to connect to agent. Please try again later.', 'bot');
                        }
                    } catch (error) {
                        addMessage('❌ Unable to connect to agent. Please try again later.', 'bot');
                    }
                    return; // Exit early for human agent
            }
            
            if (message) {
                addMessage(message, 'user');
                
                try {
                    // Generate new session ID to clear conversation context
                    sessionId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
                    
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_id: sessionId,
                            message: message
                        })
                    });
                    
                    const data = await response.json();
                    const botResponse = data.answer || 'Sorry, I could not process your request.';
                    
                    // Check for human handover
                    if (data.handover === true) {
                        startHumanChat(sessionId);
                        return;
                    }
                    
                    addMessage(botResponse, 'bot');
                    
                    // Check if we should show resort selection buttons - broader detection
                    if (botResponse.toLowerCase().includes('resort') && 
                        (botResponse.toLowerCase().includes('name') || 
                         botResponse.toLowerCase().includes('which') || 
                         botResponse.toLowerCase().includes('select') ||
                         botResponse.toLowerCase().includes('choose') ||
                         botResponse.toLowerCase().includes('enter'))) {
                        setTimeout(() => addResortSelectionButtons(), 500);
                    }
                    
                } catch (error) {
                    addMessage('❌ Unable to connect. Please try again.', 'bot');
                }
            }
        }
        
        // Resort selection buttons (dynamic)
        if (e.target.classList.contains('resort-select-btn')) {
            const resortName = e.target.getAttribute('data-resort') || '';
            // Sanitize resort name before using
            const sanitizedResortName = resortName.replace(/[<>"'&]/g, function(match) {
                const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
                return map[match];
            });
            addMessage(sanitizedResortName, 'user');
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionId,
                        message: resortName
                    })
                });
                
                const data = await response.json();
                
                // Check for human handover
                if (data.handover === true) {
                    startHumanChat(sessionId);
                    return;
                }
                
                addMessage(data.answer || 'Sorry, I could not process your request.', 'bot');
                
            } catch (error) {
                addMessage('❌ Unable to connect. Please try again.', 'bot');
            }
        }
    });
    
    // Human agent button
    const humanBtn = document.getElementById('vrbHumanBtn');
    if (humanBtn) {
        humanBtn.addEventListener('click', async () => {
            addMessage('👩💼 Connecting you to a human agent...', 'bot');
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionId,
                        message: '__HUMAN__'
                    })
                });
                
                const data = await response.json();
                
                if (data.handover === true) {
                    startHumanChat(sessionId);
                } else {
                    addMessage('⚠️ Agents are offline. Chat on WhatsApp 👉 <a href="https://wa.me/918341674465" target="_blank">WhatsApp Support</a>', 'bot');
                }
            } catch (error) {
                addMessage('❌ Unable to connect to agent. Please try again later.', 'bot');
            }
        });
    }
    
    console.log('✅ Premium chat widget initialized with MCP server integration');
}

// Human chat functionality
let humanSocket = null;
let humanChatActive = false;
let connectionAttempts = 0;
const maxRetries = 3;

function startHumanChat(sessionId) {
    if (humanChatActive) {
        console.log('Human chat already active');
        return;
    }
    
    addMessage('👩💼 Connecting to human agent...', 'bot');
    humanChatActive = true;
    connectionAttempts = 0;
    
    connectToHumanAgent(sessionId);
}

function connectToHumanAgent(sessionId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//35.154.92.5:8000/dashboard/ws/user/${sessionId}`;
    
    try {
        humanSocket = new WebSocket(wsUrl);

        humanSocket.onopen = () => {
            console.log('✅ Connected to human agent');
            connectionAttempts = 0;
            addMessage('👩💼 Connected to human agent! Please wait for a response...', 'bot');
        };

        humanSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.message) {
                    addAgentMessage(data.message);
                }
            } catch (e) {
                console.error('Error parsing agent message:', e);
            }
        };

        humanSocket.onerror = (error) => {
            console.error('Human chat WebSocket error:', error);
            handleHumanChatError(sessionId);
        };

        humanSocket.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            
            if (humanChatActive) {
                if (event.code === 1000) {
                    // Normal closure
                    addMessage('ℹ️ Human chat ended.', 'bot');
                    humanChatActive = false;
                } else {
                    // Unexpected closure - try to reconnect
                    handleHumanChatError(sessionId);
                }
            }
        };
        
        // Connection timeout
        setTimeout(() => {
            if (humanSocket && humanSocket.readyState === WebSocket.CONNECTING) {
                console.log('WebSocket connection timeout');
                humanSocket.close();
                handleHumanChatError(sessionId);
            }
        }, 10000);
        
    } catch (error) {
        console.error('WebSocket creation error:', error);
        handleHumanChatError(sessionId);
    }
}

function handleHumanChatError(sessionId) {
    connectionAttempts++;
    
    if (connectionAttempts < maxRetries) {
        console.log(`Retrying human chat connection (${connectionAttempts}/${maxRetries})`);
        addMessage(`🔄 Connection lost. Retrying... (${connectionAttempts}/${maxRetries})`, 'bot');
        
        setTimeout(() => {
            connectToHumanAgent(sessionId);
        }, 2000 * connectionAttempts);
    } else {
        console.log('Max human chat connection attempts reached');
        addMessage('❌ Unable to connect to human agent. Please try again later.', 'bot');
        humanChatActive = false;
        humanSocket = null;
    }
}

function addAgentMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'vrb-msg vrb-bot';
    
    // Sanitize message
    const sanitizedMessage = message.replace(/[<>"'&]/g, function(match) {
        const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
        return map[match];
    });
    
    messageDiv.innerHTML = `
        <div class="bot-avatar">👩💼</div>
        <div class="msg-content">${sanitizedMessage}</div>
    `;
    
    const chatBody = document.getElementById('vrbChatBody');
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}
