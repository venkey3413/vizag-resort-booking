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
    },100);
    
    // Click outside modal to close
    window.onclick=function(event){
        const modal=document.getElementById('bookingModal');
        if(event.target===modal)window.closeModal();
    }
}

// Load resorts immediately
fetch('/api/resorts').then(r=>r.json()).then(resorts=>{
    window.resorts=resorts;
    const grid=document.getElementById('resortsGrid');
    if(grid&&resorts){
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
            return `<div class="resort-card"><img src="${r.image}" alt="${r.name}" class="resort-image"><div class="resort-info"><h3>${r.name}</h3><p class="resort-location">📍 ${r.location}${r.map_link?`<br><a href="${r.map_link}" target="_blank" class="view-map-btn">🗺️ View Map</a>`:''}</p><p class="resort-price">${pricingDisplay}</p><p class="resort-description">${r.description}</p>${r.amenities?`<div class="resort-amenities"><h4>🏨 Amenities:</h4><div class="amenities-list">${r.amenities.split('\n').filter(a=>a.trim()).map(amenity=>`<span class="amenity-tag">${amenity.trim()}</span>`).join('')}</div></div>`:''}<button class="book-btn" onclick="bookNow(${r.id},'${r.name.replace(/'/g,"\\'")}')">Book Now</button></div></div>`;
        }).join('');
    }
}).catch(e=>console.log('Resorts loading deferred'))

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
            
            // Set default +91 for phone - force it
            const phoneInput=document.getElementById('phone');
            if(phoneInput){phoneInput.value='+91';phoneInput.focus();phoneInput.blur()}
            
            const today=new Date().toISOString().split('T')[0];
            const tomorrow=new Date();
            tomorrow.setDate(tomorrow.getDate()+1);
            document.getElementById('checkIn').value=today;
            document.getElementById('checkOut').value=tomorrow.toISOString().split('T')[0];
            
            const basePrice=resort.price;
            const platformFee=Math.round(basePrice*0.015);
            const total=basePrice+platformFee;
            document.getElementById('baseAmount').textContent=`₹${total.toLocaleString()}`;
            document.getElementById('totalAmount').textContent=`₹${total.toLocaleString()}`;
            
            modal.style.display='block';
        }
    }else{
        alert('Please wait for page to load completely.');
    }
}

// Handle booking form submission
window.handleBookingSubmit=function(e){
    e.preventDefault();
    const formData={
        resortId:document.getElementById('resortId').value,
        guestName:document.getElementById('guestName').value,
        email:document.getElementById('email').value,
        phone:document.getElementById('phone').value,
        checkIn:document.getElementById('checkIn').value,
        checkOut:document.getElementById('checkOut').value,
        guests:document.getElementById('guests').value
    };
    
    // Basic validation
    if(!formData.guestName||!formData.email||!formData.phone||!formData.checkIn||!formData.checkOut){
        alert('Please fill all required fields');
        return;
    }
    
    // Phone validation
    if(!formData.phone.startsWith('+91')||formData.phone.length!==13){
        alert('Please enter a valid phone number with +91');
        return;
    }
    
    // Create booking data for payment
    const resort=window.resorts.find(r=>r.id==formData.resortId);
    const basePrice=resort.price;
    const platformFee=Math.round(basePrice*0.015);
    const total=basePrice+platformFee;
    
    const bookingData={
        ...formData,
        resortName:resort.name,
        basePrice:basePrice,
        platformFee:platformFee,
        totalPrice:total,
        bookingReference:`RB${String(Date.now()).slice(-6)}`
    };
    
    // Show payment interface
    showPaymentInterface(bookingData);
    window.closeModal();
}

// Enhanced payment interface
function showPaymentInterface(bookingData){
    const paymentModal=document.createElement('div');
    paymentModal.className='payment-modal';
    paymentModal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    paymentModal.innerHTML=`
        <div style="background:white;padding:20px;border-radius:10px;max-width:500px;width:90%;position:relative;">
            <span onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:10px;right:15px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
            <h2>💳 Complete Payment</h2>
            <div style="margin:15px 0;">
                <p><strong>Resort:</strong> ${bookingData.resortName}</p>
                <p><strong>Guest:</strong> ${bookingData.guestName}</p>
                <p><strong>Total:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                <p><strong>Reference:</strong> ${bookingData.bookingReference}</p>
            </div>
            <div style="margin:20px 0;">
                <h3>🔗 UPI Payment</h3>
                <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                <p><strong>Amount:</strong> ₹${bookingData.totalPrice.toLocaleString()}</p>
                <input type="text" placeholder="Enter 12-digit UTR" id="utrInput" maxlength="12" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;">
                <button onclick="confirmCriticalPayment()" style="background:#28a745;color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;width:100%;margin:10px 0;">✅ Confirm Payment</button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:#dc3545;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;width:100%;">Cancel</button>
        </div>
    `;
    document.body.appendChild(paymentModal);
    
    // Store booking data globally for payment confirmation
    window.pendingCriticalBooking=bookingData;
    
    window.confirmCriticalPayment=function(){
        const utr=document.getElementById('utrInput').value;
        if(!utr){
            alert('Please enter your 12-digit UTR number');
            return;
        }
        if(!/^[0-9]{12}$/.test(utr)){
            alert('UTR number must be exactly 12 digits');
            return;
        }
        
        // Create booking with payment info
        fetch('/api/bookings',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({...window.pendingCriticalBooking,transactionId:utr})
        }).then(r=>r.json()).then(result=>{
            if(result.error){
                alert('Booking failed: '+result.error);
            }else{
                alert('Payment submitted for verification. You will be notified via email and WhatsApp.');
                paymentModal.remove();
                window.pendingCriticalBooking=null;
            }
        }).catch(e=>{
            alert('Network error. Please try again.');
        });
    }
}

// Fallback for script.js
window.openBookingModal=function(resortId){
    const resort=window.resorts?.find(r=>r.id==resortId);
    if(resort)bookNow(resortId,resort.name);
}

// Load main script immediately
const script=document.createElement('script');
script.src='script.js?v=1.0.5';
document.head.appendChild(script);