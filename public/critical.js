// Critical JavaScript - only essential functions
function scrollToSection(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}
// Banner rotation
let currentSlide=0;
function initBannerRotation(){
    const slides=document.querySelectorAll('.banner-slide');
    if(slides.length>0){
        function showSlide(n){slides.forEach(s=>s.classList.remove('active'));slides[n].classList.add('active')}
        function nextSlide(){currentSlide=(currentSlide+1)%slides.length;showSlide(currentSlide)}
        setInterval(nextSlide,5000);
    }
}
// Initialize when DOM is ready
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initBannerRotation)}else{initBannerRotation()}
// Cache clearing
if(!sessionStorage.getItem('cache_cleared_v5')){sessionStorage.setItem('cache_cleared_v5','true');window.location.reload(true)}
// Lazy load non-critical JS
window.addEventListener('load',()=>{setTimeout(()=>{const script=document.createElement('script');script.src='script.js?v=1.0.5';script.defer=true;document.head.appendChild(script)},2000)})