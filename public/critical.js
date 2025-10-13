// Critical JavaScript - only essential functions
function scrollToSection(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}
let currentSlide=0;const slides=document.querySelectorAll('.banner-slide');
function showSlide(n){slides.forEach(s=>s.classList.remove('active'));slides[n].classList.add('active')}
function nextSlide(){currentSlide=(currentSlide+1)%slides.length;showSlide(currentSlide)}
// Auto-rotate banner
setInterval(nextSlide,5000);
// Cache clearing
if(!sessionStorage.getItem('cache_cleared_v4')){sessionStorage.setItem('cache_cleared_v4','true');window.location.reload(true)}
// Lazy load non-critical JS
window.addEventListener('load',()=>{setTimeout(()=>{const script=document.createElement('script');script.src='script.js?v=1.0.4';script.defer=true;document.head.appendChild(script)},2000)})