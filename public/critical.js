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
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){initBannerRotation();setupModalEvents()})}else{initBannerRotation();setupModalEvents()}

// Modal close function
window.closeModal=function(){
    const modal=document.getElementById('bookingModal');
    if(modal){
        modal.style.display='none';
        document.getElementById('bookingForm').reset();
    }
}

// Setup modal events
function setupModalEvents(){
    // Close button - wait for DOM
    setTimeout(function(){
        const closeBtn=document.querySelector('.close');
        if(closeBtn)closeBtn.onclick=window.closeModal;
        
        // Form submission
        const form=document.getElementById('bookingForm');
        if(form)form.onsubmit=window.handleBookingSubmit;
        
        // Email input and OTP setup
        const emailInput=document.getElementById('email');
        if(emailInput){
            emailInput.addEventListener('input',function(){
                const email = this.value;
                const sendEmailOtpBtn=document.getElementById('sendEmailOtpBtn');
                if(sendEmailOtpBtn){
                    if(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
                        sendEmailOtpBtn.style.display='inline-block';
                    }else{
                        sendEmailOtpBtn.style.display='none';
                        document.getElementById('emailOtpGroup').style.display='none';
                    }
                }
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
    
    // Click outside modal to close
    window.onclick=function(event){
        const modal=document.getElementById('bookingModal');
        if(event.target===modal)window.closeModal();
    }
}

// Load resorts immediately with CSRF protection
fetch('/api/resorts',{headers:{'X-Requested-With':'XMLHttpRequest','Content-Type':'application/json'}}).then(r=>{
    console.log('🏨 Resort API response status:', r.status);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}).then(resorts=>{
    console.log('🏨 Resorts loaded:', resorts.length, 'resorts');
    window.resorts=resorts;
    const grid=document.getElementById('resortsGrid');
    if(!grid){
        console.error('❌ Resort grid element not found');
        return;
    }
    if(!resorts||resorts.length===0){
        grid.innerHTML='<p style="text-align:center;padding:2rem;color:#666;">No resorts available at the moment.</p>';
        return;
    }
    grid.innerHTML=resorts.map(r=>{
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
        const sanitize=s=>{if(!s)return '';const str=String(s);return str.replace(/[<>"'&\/]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','&':'&amp;','/':'&#x2F;'}[m]||m));};
        const safeId=parseInt(r.id)||0;
        const safeName=sanitize(r.name).replace(/[^a-zA-Z0-9\s]/g,'');
        const description = sanitize(r.description);
        const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
        const needsExpansion = description.length > 100;
        
        return `<div class="resort-card"><div class="resort-gallery"><img src="${sanitize(r.image)}" alt="${sanitize(r.name)}" class="resort-image main-image"><button class="view-more-btn" onclick="openGallery(${safeId})">📸 View More</button></div><div class="resort-info"><h3>${sanitize(r.name)}</h3><p class="resort-location">📍 ${sanitize(r.location)}${r.map_link?`<br><a href="${sanitize(r.map_link)}" target="_blank" rel="noopener" class="view-map-btn">🗺️ View Map</a>`:''}</p><p class="resort-price">${pricingDisplay}</p><div class="description-container"><p class="description-short" id="desc-short-${safeId}">${shortDesc}</p><p class="description-full" id="desc-full-${safeId}" style="display: none;">${description}</p>${needsExpansion ? `<button class="view-more-desc" onclick="toggleDescription(${safeId})">View More</button>` : ''}</div>${r.amenities?`<div class="resort-amenities"><h4>🏨 Amenities:</h4><div class="amenities-list">${r.amenities.split('\n').filter(a=>a.trim()).map(amenity=>`<span class="amenity-tag">${sanitize(amenity.trim())}</span>`).join('')}</div></div>`:''}<button class="book-btn" onclick="bookNow(${safeId},'${safeName}')">Book Now</button></div></div>`;
    }).join('');
    console.log('✅ Resorts displayed successfully');
}).catch(e=>{
    console.error('❌ Resort loading failed:', e);
    const grid=document.getElementById('resortsGrid');
    if(grid){
        grid.innerHTML='<p style="text-align:center;padding:2rem;color:#dc3545;">Failed to load resorts. Please refresh the page.</p>';
    }
})

// Cache clearing
if(!sessionStorage.getItem('cache_cleared_v7')){sessionStorage.setItem('cache_cleared_v7','true');window.location.reload(true)}

// EventBridge real-time sync
console.log('📡 EventBridge real-time sync enabled');
try{
    const eventSource=new EventSource('/api/events');
    eventSource.onmessage=function(event){
        try{
            const data=JSON.parse(event.data);
            console.log('📡 EventBridge event received:',data);
            if(data.type==='resort.added'||data.type==='resort.updated'||data.type==='resort.deleted'){
                console.log('🏨 Resort update detected - refreshing resorts now!');
                location.reload();
            }
            if(data.type==='resort.availability.updated'){
                console.log('📅 Resort availability updated - reloading blocked dates');
                const resortIdInput=document.getElementById('resortId');
                if(resortIdInput&&resortIdInput.value){
                    const currentResortId=resortIdInput.value;
                    fetch(`/api/blocked-dates/${currentResortId}`).then(r=>r.json()).then(blockedDates=>{
                        window.currentResortBlockedDates=blockedDates;
                        console.log('✅ Updated blocked dates:',blockedDates);
                    }).catch(e=>console.log('Failed to reload blocked dates:',e));
                }
            }
        }catch(error){
            console.log('📡 EventBridge ping or invalid data:',event.data);
        }
    };
    eventSource.onerror=function(error){
        console.log('⚠️ EventBridge connection error:',error);
    };
    eventSource.onopen=function(){
        console.log('✅ EventBridge connected successfully');
    };
}catch(error){
    console.error('EventBridge setup failed:',error);
}

// Direct booking function
window.bookNow=function(resortId,resortName){
    const modal=document.getElementById('bookingModal');
    if(modal){
        const resort=window.resorts.find(r=>r.id==resortId);
        if(resort){
            document.getElementById('resortId').value=resortId;
            document.getElementById('resortPrice').value=resort.price;
            document.getElementById('modalResortName').textContent=`Book ${resortName}`;
            
            // Reset email verification state
            window.emailVerified = false;
            window.emailOtpCode = null;
            
            // Reset coupon data
            window.appliedCouponCode = null;
            window.appliedDiscountAmount = 0;
            document.getElementById('couponCode').value = '';
            document.getElementById('couponMessage').innerHTML = '';
            document.getElementById('discountRow').style.display = 'none';
            
            // Reset email input
            const emailInput=document.getElementById('email');
            if(emailInput){
                emailInput.classList.remove('email-verified');
                emailInput.readOnly = false;
            }
            
            // Set default +91 for phone
            const phoneInput=document.getElementById('phone');
            if(phoneInput){
                phoneInput.value='+91';
                phoneInput.focus();
                phoneInput.blur();
            }
            
            // Reset OTP elements
            document.getElementById('sendEmailOtpBtn').style.display = 'none';
            document.getElementById('emailOtpGroup').style.display = 'none';
            document.getElementById('emailOtpCode').value = '';
            
            // Disable booking button initially
            const bookBtn = document.querySelector('#bookingModal .book-btn');
            if (bookBtn) {
                bookBtn.disabled = true;
                bookBtn.textContent = 'Verify Email First';
            }
            
            const today=new Date().toISOString().split('T')[0];
            const tomorrow=new Date();
            tomorrow.setDate(tomorrow.getDate()+1);
            
            // Set minimum dates to prevent past bookings
            document.getElementById('checkIn').min = today;
            document.getElementById('checkOut').min = tomorrow.toISOString().split('T')[0];
            
            document.getElementById('checkIn').value=today;
            document.getElementById('checkOut').value=tomorrow.toISOString().split('T')[0];
            
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
                updatePricing();
            });
            
            checkOutInput.addEventListener('change', updatePricing);
            
            // Load coupons for booking modal
            fetch('/api/coupons').then(r=>r.json()).then(coupons=>{
                window.bookingModalCoupons = {};
                coupons.forEach(c => {
                    window.bookingModalCoupons[c.code] = {discount: c.discount, type: c.type, day_type: c.day_type};
                });
                console.log('✅ Booking modal coupons loaded:', window.bookingModalCoupons);
            }).catch(e=>console.log('❌ Booking modal coupon load failed:', e));
            
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
                        msg.innerHTML = '<span style="color:#dc3545;">Invalid coupon code</span>';
                        console.log('❌ Coupon not found:', code);
                        return;
                    }
                    
                    console.log('✅ Found coupon:', coupon);
                    
                    // Check day type
                    const checkInDate = new Date(checkIn);
                    const dayOfWeek = checkInDate.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
                    const dayType = isWeekend ? 'weekend' : 'weekday';
                    
                    if (coupon.day_type !== 'all' && coupon.day_type !== dayType) {
                        const validDays = coupon.day_type === 'weekday' ? 'weekdays (Mon-Thu)' : 'weekends (Fri-Sun)';
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
                
                if (checkIn && checkOut) {
                    const checkInDate = new Date(checkIn);
                    const checkOutDate = new Date(checkOut);
                    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
                    
                    // Apply dynamic pricing
                    const checkInDayOfWeek = checkInDate.getDay();
                    let nightlyRate = resort.price;
                    
                    if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
                        if (checkInDayOfWeek === 0 || checkInDayOfWeek === 5 || checkInDayOfWeek === 6) {
                            const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
                            if (weekendPrice) nightlyRate = weekendPrice.price;
                        } else {
                            const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
                            if (weekdayPrice) nightlyRate = weekdayPrice.price;
                        }
                    }
                    
                    const basePrice = nightlyRate * nights;
                    const platformFee = Math.round(basePrice * 0.015);
                    const total = basePrice + platformFee;
                    
                    document.getElementById('baseAmount').textContent = `₹${total.toLocaleString()}`;
                    
                    // Recalculate coupon discount if applied
                    if (window.appliedCouponCode && window.bookingModalCoupons) {
                        const coupon = window.bookingModalCoupons[window.appliedCouponCode];
                        if (coupon) {
                            // Check day type for new date
                            const dayOfWeek = checkInDate.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
                            const dayType = isWeekend ? 'weekend' : 'weekday';
                            
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
                                document.getElementById('totalAmount').textContent = `₹${finalTotal.toLocaleString()}`;
                                document.getElementById('discountAmount').textContent = `-₹${discountAmount.toLocaleString()}`;
                                document.getElementById('discountRow').style.display = 'block';
                                document.getElementById('couponMessage').innerHTML = `<span style="color:#28a745;">Coupon applied! Saved ₹${discountAmount.toLocaleString()}</span>`;
                            } else {
                                // Coupon not valid for new date
                                window.appliedCouponCode = null;
                                window.appliedDiscountAmount = 0;
                                document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
                                document.getElementById('discountRow').style.display = 'none';
                                const validDays = coupon.day_type === 'weekday' ? 'weekdays (Mon-Thu)' : 'weekends (Fri-Sun)';
                                document.getElementById('couponMessage').innerHTML = `<span style="color:#dc3545;">Coupon removed - valid only for ${validDays}</span>`;
                            }
                        } else {
                            document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
                            document.getElementById('discountRow').style.display = 'none';
                        }
                    } else {
                        document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
                        document.getElementById('discountRow').style.display = 'none';
                    }
                }
            }
            
            // Initial pricing calculation
            updatePricing();
            
            modal.style.display='block';
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
window.handleBookingSubmit=function(e){
    e.preventDefault();
    console.log('🎯 Booking form submitted');
    
    // Check email verification first
    if (!window.emailVerified) {
        console.log('❌ Email not verified');
        showCriticalNotification('Please verify your email address with OTP first', 'error');
        return;
    }
    console.log('✅ Email verified, proceeding with booking');
    
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
    
    // Create booking data for payment
    const resort=window.resorts.find(r=>r.id==formData.resortId);
    if(!resort){
        console.log('❌ Resort not found for ID:', formData.resortId);
        showCriticalNotification('Resort not found', 'error');
        return;
    }
    console.log('✅ Resort found:', resort.name);
    
    const checkInDate=new Date(formData.checkIn);
    const checkOutDate=new Date(formData.checkOut);
    const nights=Math.max(1,Math.ceil((checkOutDate-checkInDate)/(1000*60*60*24)));
    
    // Apply dynamic pricing based on check-in date
    const checkInDayOfWeek = checkInDate.getDay();
    let nightlyRate = resort.price;
    
    if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
        // Mon-Thu = weekdays (1,2,3,4), Fri-Sun = weekends (5,6,0)
        if (checkInDayOfWeek === 0 || checkInDayOfWeek === 5 || checkInDayOfWeek === 6) {
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
    
    const bookingData = {
        ...formData,
        resortName: resort.name,
        basePrice: basePrice,
        platformFee: platformFee,
        totalPrice: total,
        bookingReference: `RB${String(Date.now()).slice(-6)}`,
        couponCode: window.appliedCouponCode || null,
        discountAmount: window.appliedDiscountAmount || 0
    };
    
    console.log('✅ Booking data prepared:', bookingData);
    showPaymentInterface(bookingData);
    window.closeModal();
}

// Enhanced payment interface with card payment
function showPaymentInterface(bookingData){
    const paymentModal=document.createElement('div');
    paymentModal.className='payment-modal';
    paymentModal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    paymentModal.innerHTML=`
        <div style="background:white;padding:20px;border-radius:10px;max-width:500px;width:90%;position:relative;max-height:90vh;overflow-y:auto;">
            <span onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:10px;right:15px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
            <h2>💳 Complete Payment</h2>
            <div style="margin:15px 0;">
                <p><strong>Resort:</strong> ${bookingData.resortName.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}</p>
                <p><strong>Guest:</strong> ${bookingData.guestName.replace(/[<>"'&]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[m]))}</p>
                <p><strong>Total:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                <p><strong>Reference:</strong> ${bookingData.bookingReference}</p>
            </div>
            

            
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
            
            <button onclick="this.parentElement.parentElement.remove()" style="background:#dc3545;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;width:100%;">Cancel</button>
        </div>
    `;
    document.body.appendChild(paymentModal);
    
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
                'X-CSRF-Token':sessionStorage.getItem('csrf-token')||''
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
                'X-CSRF-Token':sessionStorage.getItem('csrf-token')||''
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
    
    let galleryImages=[];
    if(resort.image)galleryImages.push(resort.image);
    if(resort.gallery){
        resort.gallery.split('\n').filter(img=>img.trim()).forEach(img=>{
            galleryImages.push(img.trim());
        });
    }
    if(galleryImages.length===0){
        galleryImages=['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800'];
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
                    <img src="${galleryImages[currentIndex]}" style="max-width:100%;max-height:400px;object-fit:contain;border-radius:8px;">
                    ${galleryImages.length>1?`
                        <button onclick="prevImage()" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:white;border:none;padding:10px 15px;border-radius:50%;cursor:pointer;font-size:18px;">&lt;</button>
                        <button onclick="nextImage()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:white;border:none;padding:10px 15px;border-radius:50%;cursor:pointer;font-size:18px;">&gt;</button>
                    `:''}
                </div>
                ${galleryImages.length>1?`
                    <div style="display:flex;gap:10px;margin-bottom:20px;overflow-x:auto;padding:10px 0;justify-content:center;">
                        ${galleryImages.map((img,i)=>`<img src="${img}" onclick="setImage(${i})" style="width:80px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;opacity:${i===currentIndex?'1':'0.6'};border:2px solid ${i===currentIndex?'#28a745':'transparent'};transition:all 0.3s;">`).join('')}
                    </div>
                `:''}
                <div style="background:#f8f9fa;padding:15px;border-radius:8px;">
                    <p><strong>Location:</strong> ${resort.location}</p>
                    <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
                    <p><strong>Description:</strong> ${resort.description}</p>
                    <p style="margin-top:10px;color:#666;font-size:0.9rem;">Image ${currentIndex+1} of ${galleryImages.length}</p>
                </div>
            </div>
        `;
    }
    
    window.nextImage=function(){currentIndex=(currentIndex+1)%galleryImages.length;updateModal()};
    window.prevImage=function(){currentIndex=currentIndex===0?galleryImages.length-1:currentIndex-1;updateModal()};
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
            z-index: 10000;
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
            z-index: 10000;
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
            z-index: 3000;
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