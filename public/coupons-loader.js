// Load coupons dynamically from API
async function loadCoupons() {
  try {
    const response = await fetch('/api/coupons');
    const coupons = await response.json();
    
    if (!coupons || coupons.length === 0) {
      displayNoCoupons();
      return;
    }
    
    displayCoupons(coupons);
  } catch (error) {
    console.error('Error loading coupons:', error);
    displayNoCoupons();
  }
}

function displayCoupons(coupons) {
  const slider = document.getElementById('vrb-coupon-slider');
  
  if (!slider) {
    console.error('Coupon slider element not found');
    return;
  }
  
  // Clear existing coupons
  slider.innerHTML = '';
  
  // Add each coupon as a card
  coupons.forEach(coupon => {
    const card = createCouponCard(coupon);
    slider.appendChild(card);
  });
}

function createCouponCard(coupon) {
  const card = document.createElement('div');
  card.className = 'vrb-coupon-card';
  
  // Format discount display
  const discountDisplay = coupon.discount_type === 'percentage' 
    ? `${coupon.discount_value}% OFF` 
    : `₹${coupon.discount_value} OFF`;
  
  // Format validity date
  const validityDate = new Date(coupon.valid_until || Date.now() + 30*24*60*60*1000);
  const formattedDate = validityDate.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  
  card.innerHTML = `
    <div class="vrb-coupon-img">
      <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400" alt="${coupon.code}">
      <span class="vrb-coupon-badge">${discountDisplay}</span>
    </div>
    <div class="vrb-coupon-body">
      <h3>${coupon.code}</h3>
      <p class="vrb-coupon-day">Valid till ${formattedDate}</p>
      <div class="vrb-coupon-code">
        <label class="label">Coupon Code</label>
        <div class="code-row">
          <code>${coupon.code}</code>
          <button class="copy-btn" onclick="copyCoupon('${coupon.code}')">Copy</button>
        </div>
      </div>
    </div>
  `;
  
  return card;
}

function displayNoCoupons() {
  const slider = document.getElementById('vrb-coupon-slider');
  
  if (!slider) return;
  
  slider.innerHTML = `
    <div class="vrb-coupon-empty" style="width: 100%; text-align: center; padding: 40px 20px; color: #999;">
      <p>No active coupons available at the moment. Check back soon!</p>
    </div>
  `;
}

// Scroll functions
function scrollCouponLeft() {
  const slider = document.getElementById('vrb-coupon-slider');
  slider.scrollBy({ left: -350, behavior: 'smooth' });
}

function scrollCouponRight() {
  const slider = document.getElementById('vrb-coupon-slider');
  slider.scrollBy({ left: 350, behavior: 'smooth' });
}

// Copy coupon code to clipboard
function copyCoupon(code) {
  navigator.clipboard.writeText(code);
  alert('Coupon code ' + code + ' copied to clipboard!');
}

// Load coupons when page loads
document.addEventListener('DOMContentLoaded', loadCoupons);

// Reload coupons every 5 minutes to get latest offers
setInterval(loadCoupons, 5 * 60 * 1000);
