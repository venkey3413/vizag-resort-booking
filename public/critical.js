// Critical JavaScript - only essential functions
function scrollToSection(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}
// Banner rotation
window.currentSlide=0;
function initBannerRotation(){
    window.bannerRotationInitialized=true;
    const slides=document.querySelectorAll('.banner-slide');
    if(slides.length>0){
        function showSlide(n){slides.forEach(s=>s.classList.remove('active'));slides[n].classList.add('active')}
        function nextSlide(){window.currentSlide=(window.currentSlide+1)%slides.length;showSlide(window.currentSlide)}
        setInterval(nextSlide,5000);
    }
}
// Initialize when DOM is ready
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initBannerRotation)}else{initBannerRotation()}
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
            return `<div class="resort-card"><img src="${r.image}" alt="${r.name}" class="resort-image"><div class="resort-info"><h3>${r.name}</h3><p class="resort-location">📍 ${r.location}${r.map_link?`<br><a href="${r.map_link}" target="_blank" class="view-map-btn">🗺️ View Map</a>`:''}</p><p class="resort-price">${pricingDisplay}</p><p class="resort-description">${r.description}</p>${r.amenities?`<div class="resort-amenities"><h4>🏨 Amenities:</h4><div class="amenities-list">${r.amenities.split('\n').filter(a=>a.trim()).map(amenity=>`<span class="amenity-tag">${amenity.trim()}</span>`).join('')}</div></div>`:''}<button class="book-btn" onclick="window.openBookingModal(${r.id})">Book Now</button></div></div>`;
        }).join('');
    }
}).catch(e=>console.log('Resorts loading deferred'))
// Cache clearing
if(!sessionStorage.getItem('cache_cleared_v7')){sessionStorage.setItem('cache_cleared_v7','true');window.location.reload(true)}
// Essential booking modal function
window.openBookingModal=function(resortId){
    if(typeof window.openBookingModalFull==='function'){
        window.openBookingModalFull(resortId);
    }else{
        showNotification('Please wait for page to fully load, then try again.', 'error');
    }
}
// Load full script immediately
if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadMainScript);
}else{
    loadMainScript();
}
function loadMainScript(){
    const script=document.createElement('script');
    script.src='script.js?v=1.0.5';
    script.onload=()=>{
        if(typeof openBookingModal==='function'){
            window.openBookingModalFull=openBookingModal;
        }
    };
    document.head.appendChild(script);
}
// Simple notification function
function showNotification(message,type){
    const notification=document.createElement('div');
    notification.className=`notification ${type}`;
    notification.textContent=message;
    notification.style.cssText='position:fixed;top:20px;right:20px;padding:15px;border-radius:5px;color:white;z-index:10000;'+(type==='error'?'background:#dc3545;':'background:#28a745;');
    document.body.appendChild(notification);
    setTimeout(()=>notification.remove(),3000);
}