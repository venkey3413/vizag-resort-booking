// Coupon Slider Functions
function scrollCouponLeft(){
  const slider = document.getElementById('vrb-coupon-slider');
  slider.scrollBy({ left: -350, behavior: 'smooth' });
}

function scrollCouponRight(){
  const slider = document.getElementById('vrb-coupon-slider');
  slider.scrollBy({ left: 350, behavior: 'smooth' });
}

function copyCoupon(code){
  navigator.clipboard.writeText(code);
  alert('Coupon code ' + code + ' copied to clipboard!');
}
