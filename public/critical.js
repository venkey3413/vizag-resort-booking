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

// Load resorts immediately with CSRF protection
fetch('/api/resorts',{headers:{'X-Requested-With':'XMLHttpRequest','Content-Type':'application/json'}}).then(r=>r.json()).then(resorts=>{
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
            const sanitize=s=>{if(!s)return '';const str=String(s);return str.replace(/[<>"'&\/]/g,m=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','&':'&amp;','/':'&#x2F;'}[m]||m));};
            const safeId=parseInt(r.id)||0;
            const safeName=sanitize(r.name).replace(/[^a-zA-Z0-9\s]/g,'');
            return `<div class="resort-card"><img src="${sanitize(r.image)}" alt="${sanitize(r.name)}" class="resort-image"><div class="resort-info"><h3>${sanitize(r.name)}</h3><p class="resort-location">📍 ${sanitize(r.location)}${r.map_link?`<br><a href="${sanitize(r.map_link)}" target="_blank" rel="noopener" class="view-map-btn">🗺️ View Map</a>`:''}</p><p class="resort-price">${pricingDisplay}</p><p class="resort-description">${sanitize(r.description)}</p>${r.amenities?`<div class="resort-amenities"><h4>🏨 Amenities:</h4><div class="amenities-list">${r.amenities.split('\n').filter(a=>a.trim()).map(amenity=>`<span class="amenity-tag">${sanitize(amenity.trim())}</span>`).join('')}</div></div>`:''}<button class="book-btn" onclick="bookNow(${safeId},'${safeName}')">Book Now</button></div></div>`;
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
        showCriticalNotification('Please wait for page to load completely.', 'error');
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
    
    // Create booking data for payment
    const resort=window.resorts.find(r=>r.id==formData.resortId);
    if(!resort){showCriticalNotification('Resort not found', 'error');return}
    
    const checkInDate=new Date(formData.checkIn);
    const checkOutDate=new Date(formData.checkOut);
    const nights=Math.max(1,Math.ceil((checkOutDate-checkInDate)/(1000*60*60*24)));
    const basePrice=resort.price*nights;
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
        const utr=document.getElementById('utrInput').value;
        if(!utr){showCriticalNotification('Please enter your 12-digit UTR number', 'error');return}
        if(!/^[0-9]{12}$/.test(utr)){showCriticalNotification('UTR number must be exactly 12 digits', 'error');return}
        
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
                transactionId:sanitizeInput(utr).substring(0,50)
            })
        }).then(r=>r.json()).then(result=>{
            if(result.error){
                showCriticalNotification('Booking failed: '+result.error, 'error');
            }else{
                showCriticalNotification('Payment submitted for verification. You will be notified via email and WhatsApp.', 'success');
                paymentModal.remove();
                window.pendingCriticalBooking=null;
            }
        }).catch(e=>showCriticalNotification('Network error. Please try again.', 'error')).finally(()=>{
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
    
    if (isBookingConfirmation && !document.getElementById('critical-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'critical-animation-styles';
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
    
    const duration = isBookingConfirmation ? 10000 : 4000;
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}