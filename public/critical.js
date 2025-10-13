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
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initBannerRotation)}else{initBannerRotation()}
// Load resorts immediately
fetch('/api/resorts').then(r=>r.json()).then(resorts=>{const grid=document.getElementById('resortsGrid');if(grid&&resorts){grid.innerHTML=resorts.map(r=>`<div class="resort-card"><img src="${r.image}" alt="${r.name}" class="resort-image"><div class="resort-info"><h3>${r.name}</h3><p class="resort-location">${r.location}</p><p class="resort-price">₹${r.price}/night</p><p class="resort-description">${r.description}</p><button class="book-btn" onclick="openBookingModal(${r.id})">Book Now</button></div></div>`).join('')}}).catch(e=>console.log('Resorts loading deferred'))
// Cache clearing
if(!sessionStorage.getItem('cache_cleared_v7')){sessionStorage.setItem('cache_cleared_v7','true');window.location.reload(true)}
// Load full script
window.addEventListener('load',()=>{setTimeout(()=>{const script=document.createElement('script');script.src='script.js?v=1.0.5';document.head.appendChild(script)},1000)})