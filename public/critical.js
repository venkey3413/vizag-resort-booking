// =======================================================
// ✅ CRITICAL JS - Vizag Resort Booking (Premium UI)
// File: public/critical.js
// =======================================================

/* ---------------------------
   Helpers
--------------------------- */
function sanitize(s){
  if(!s) return "";
  return String(s).replace(/[<>"'&\/]/g, (m) => ({
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#x27;",
    "&":"&amp;",
    "/":"&#x2F;"
  }[m] || m));
}

function normalizeLocationValue(v){
  if(!v) return "all";
  const val = String(v).trim().toLowerCase();
  if(val === "" || val === "all" || val === "all locations") return "all";
  return String(v).trim();
}

function isWeekend(dateStr){
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 Sun, 6 Sat
  return day === 0 || day === 6;
}

function isFriday(dateStr){
  const d = new Date(dateStr);
  return d.getDay() === 5;
}

function getDayType(dateStr){
  // weekday: Mon-Thu, friday: Fri, weekend: Sat-Sun
  if(isFriday(dateStr)) return "friday";
  if(isWeekend(dateStr)) return "weekend";
  return "weekday";
}

function formatINR(num){
  try{
    return "₹" + Number(num || 0).toLocaleString("en-IN");
  }catch{
    return "₹" + num;
  }
}

/* ---------------------------
   Global state
--------------------------- */
window.allResorts = [];
window.filteredResorts = [];
window.resorts = []; // current rendered list
window.allCoupons = [];
window.bookingModalCoupons = {};
window.appliedCouponCode = null;
window.appliedDiscountAmount = 0;

/* ---------------------------
   Smooth Scroll
--------------------------- */
window.scrollToSection = function(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:"smooth"});
};

/* ---------------------------
   Universal Modal Close
--------------------------- */
function setupUniversalModalClose(){
  document.addEventListener("click", function(e){
    if(e.target && e.target.classList.contains("vrb-modal")){
      window.closeBookingModal();
    }
    if(e.target && e.target.classList.contains("payment-modal")){
      window.closePaymentModal();
    }
  });

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){
      window.closeBookingModal();
      if(typeof window.closePaymentModal === "function") window.closePaymentModal();
      if(typeof window.closeResortGallery === "function") window.closeResortGallery();
      if(typeof window.closeReviewModal === "function") window.closeReviewModal();
      if(typeof window.closeViewReviewsModal === "function") window.closeViewReviewsModal();
    }
  });
}

/* ---------------------------
   Booking Modal Close
--------------------------- */
window.closeBookingModal = function(){
  const modal = document.getElementById("bookingModal");
  if(modal){
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
};

window.closeBookingPopup = window.closeBookingModal;

/* ---------------------------
   Banner Rotation (optional)
--------------------------- */
window.currentSlide = 0;
function initBannerRotation(){
  const slides = document.querySelectorAll(".banner-slide");
  if(slides.length > 0){
    function showSlide(n){
      slides.forEach(s => s.classList.remove("active"));
      slides[n].classList.add("active");
    }
    function nextSlide(){
      window.currentSlide = (window.currentSlide + 1) % slides.length;
      showSlide(window.currentSlide);
    }
    setInterval(nextSlide, 5000);
  }
}

/* ---------------------------
   Load Resorts from DB
--------------------------- */
async function fetchResorts(){
  const res = await fetch("/api/resorts", {
    headers:{
      "X-Requested-With":"XMLHttpRequest",
      "Content-Type":"application/json"
    }
  });
  if(!res.ok) throw new Error("Failed to load resorts");
  return await res.json();
}

/* ---------------------------
   Load Coupons from DB
--------------------------- */
async function fetchCoupons(){
  const res = await fetch("/api/coupons", {
    headers:{
      "X-Requested-With":"XMLHttpRequest",
      "Content-Type":"application/json"
    }
  });
  if(!res.ok) return [];
  return await res.json();
}

/* ---------------------------
   Populate Location Dropdown
--------------------------- */
function loadLocationsIntoHeroSearch(resorts){
  const locationSelect = document.getElementById("locationSelect");
  if(!locationSelect) return;

  const uniqueLocations = [...new Set((resorts || []).map(r => r.location).filter(Boolean))].sort();

  locationSelect.innerHTML = "";

  // ✅ IMPORTANT FIX: All Locations value must be "all"
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = "All Locations";
  locationSelect.appendChild(optAll);

  uniqueLocations.forEach(loc=>{
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    locationSelect.appendChild(opt);
  });

  // When location changes -> filter
  locationSelect.addEventListener("change", ()=>{
    window.applyLocationFilter();
  });
}

/* ---------------------------
   Render Resort Cards (Premium UI compatible)
--------------------------- */
function createResortHTML(resort){
  const id = parseInt(resort.id) || 0;
  const name = sanitize(resort.name);
  const location = sanitize(resort.location);
  const img = sanitize(resort.image || "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200");
  const desc = sanitize(resort.description || "");
  const shortDesc = desc.length > 110 ? desc.substring(0, 110) + "..." : desc;

  let priceText = `${formatINR(resort.price)}/night`;

  // Amenities chips
  let amenitiesHTML = "";
  if(resort.amenities){
    const amenities = resort.amenities
      .split("\n")
      .map(a => a.trim())
      .filter(Boolean);

    if(amenities.length > 0){
      amenitiesHTML = `
        <div class="resort-amenities">
          <h4>🏨 Amenities:</h4>
          <div class="amenities-list">
            ${amenities.map(a => `<span class="amenity-tag">✓ ${sanitize(a)}</span>`).join("")}
          </div>
        </div>
      `;
    }
  }

  const safeName = sanitize(resort.name).replace(/[^a-zA-Z0-9\s]/g, "");

  return `
    <div class="resort-card" id="resort-${id}">
      <div class="resort-gallery">
        <img class="resort-image main-image" src="${img}" alt="${name}">
        <button class="view-more-btn" onclick="openGallery(${id})">📸 View More</button>
      </div>

      <div class="resort-info">
        <h3>${name}</h3>
        <p class="resort-location">📍 ${location}</p>
        <p class="resort-price">${priceText}</p>

        <div class="description-container">
          <p class="description-short" id="desc-short-${id}">${shortDesc}</p>
          <p class="description-full" id="desc-full-${id}" style="display:none;">${desc}</p>
          ${desc.length > 110 ? `<button class="view-more-desc" onclick="toggleDescription(${id}, event)">View More</button>` : ""}
        </div>

        ${amenitiesHTML}

        <div class="resort-actions">
          <button class="book-btn" onclick="bookNow(${id}, '${safeName}')">Book Now</button>
          <button class="review-btn" onclick="openReviewModal(${id}, '${safeName}')">Write a Review</button>
          <button class="view-reviews-btn" onclick="viewReviews(${id}, '${safeName}')">View Reviews</button>
        </div>
      </div>
    </div>
  `;
}

function renderResorts(resorts){
  const grid = document.getElementById("resortsGrid");
  if(!grid) return;

  if(!resorts || resorts.length === 0){
    grid.innerHTML = `<p style="text-align:center;padding:2rem;color:#666;">No resorts available.</p>`;
    return;
  }

  window.resorts = resorts; // current view
  grid.innerHTML = resorts.map(createResortHTML).join("");
}

/* ---------------------------
   ✅ Apply Location Filter (FIXED)
--------------------------- */
window.applyLocationFilter = function(){
  const locationSelect = document.getElementById("locationSelect");
  const val = normalizeLocationValue(locationSelect ? locationSelect.value : "all");

  let list = [...window.allResorts];

  if(val !== "all"){
    list = list.filter(r => String(r.location || "").trim() === String(val).trim());
  }

  window.filteredResorts = list;
  renderResorts(list);
};

/* ---------------------------
   ✅ Search Button -> filter resorts
--------------------------- */
function setupSearchButton(){
  const searchBtn = document.querySelector("#vrb-resort .vrb-btn-orange");
  if(!searchBtn) return;

  searchBtn.addEventListener("click", function(){
    window.applyLocationFilter();
    scrollToSection("resorts");
  });
}

/* ---------------------------
   Booking Modal Open
--------------------------- */
window.bookNow = async function(resortId, resortName){
  const modal = document.getElementById("bookingModal");
  if(!modal){
    alert("Booking Modal missing in index.html");
    return;
  }

  const resort = window.allResorts.find(r => r.id == resortId);
  if(!resort){
    alert("Resort not found");
    return;
  }

  // Fill top details
  document.getElementById("resortId").value = resortId;
  document.getElementById("resortPrice").value = resort.price;

  document.getElementById("modalResortName").textContent = `Book ${resort.name}`;
  document.getElementById("modalResortLocation").textContent = resort.location;
  document.getElementById("modalResortPrice").textContent = `${formatINR(resort.price)}/night`;

  // Reset pricing UI
  window.appliedCouponCode = null;
  window.appliedDiscountAmount = 0;
  document.getElementById("couponCode").value = "";
  document.getElementById("couponMessage").innerHTML = "";
  document.getElementById("discountRow").style.display = "none";

  // Default date
  const today = new Date();
  const checkIn = today.toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkOut = tomorrow.toISOString().split("T")[0];

  const checkInEl = document.getElementById("checkIn");
  const checkOutEl = document.getElementById("checkOut");

  checkInEl.value = checkIn;
  checkOutEl.value = checkOut;

  // Force pricing update
  updateBookingPricing(resort);

  // Load coupons for this resort
  await loadCouponsForBooking(resortId);

  // Show modal
  modal.style.display = "flex";
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
};

/* ---------------------------
   Booking Pricing Calculation
--------------------------- */
function updateBookingPricing(resort){
  const checkIn = document.getElementById("checkIn").value;
  const checkOut = document.getElementById("checkOut").value;

  const baseAmountEl = document.getElementById("baseAmount");
  const platformFeeEl = document.getElementById("platformFee");
  const totalAmountEl = document.getElementById("totalAmount");

  if(!checkIn || !checkOut){
    baseAmountEl.textContent = formatINR(resort.price);
    platformFeeEl.textContent = formatINR(Math.round(resort.price * 0.015));
    totalAmountEl.textContent = formatINR(resort.price + Math.round(resort.price * 0.015));
    return;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if(nights < 1) nights = 1;

  let nightlyRate = resort.price;

  // dynamic pricing
  if(resort.dynamic_pricing && resort.dynamic_pricing.length > 0){
    const dt = getDayType(checkIn);
    const found = resort.dynamic_pricing.find(p => p.day_type === dt);
    if(found) nightlyRate = found.price;
  }

  const basePrice = nightlyRate * nights;
  const platformFee = Math.round(basePrice * 0.015);
  const total = basePrice + platformFee;

  baseAmountEl.textContent = formatINR(basePrice);
  platformFeeEl.textContent = formatINR(platformFee);

  // Apply discount if any
  let finalTotal = total;
  if(window.appliedDiscountAmount){
    finalTotal = Math.max(0, total - window.appliedDiscountAmount);
    document.getElementById("discountAmount").textContent = `-${formatINR(window.appliedDiscountAmount)}`;
    document.getElementById("discountRow").style.display = "flex";
  }else{
    document.getElementById("discountRow").style.display = "none";
  }

  totalAmountEl.textContent = formatINR(finalTotal);
}

/* ---------------------------
   Load Coupons for Booking Modal
--------------------------- */
async function loadCouponsForBooking(resortId){
  try{
    const coupons = await fetchCoupons();
    window.allCoupons = coupons || [];

    // Filter only resort-specific or global
    const filtered = window.allCoupons.filter(c => c.resort_id === null || c.resort_id == resortId);

    window.bookingModalCoupons = {};
    filtered.forEach(c=>{
      window.bookingModalCoupons[String(c.code).toUpperCase()] = c;
    });

    showAvailableCouponsForDate(resortId);
  }catch(e){
    console.log("Coupon load error:", e);
  }
}

/* ---------------------------
   Show Available Coupons in Booking Modal
--------------------------- */
function showAvailableCouponsForDate(resortId){
  const checkIn = document.getElementById("checkIn").value;
  const dayType = getDayType(checkIn);

  const couponsDiv = document.getElementById("availableCoupons");
  const couponInput = document.getElementById("couponCode");

  if(!couponsDiv) return;

  const validCoupons = (window.allCoupons || []).filter(c=>{
    const resortMatch = (c.resort_id === null || c.resort_id == resortId);
    const dayMatch = (c.day_type === "all" || c.day_type === dayType);
    return resortMatch && dayMatch;
  });

  couponsDiv.style.display = "block";

  if(validCoupons.length === 0){
    couponsDiv.innerHTML = `
      <div style="padding:10px;border-radius:12px;background:#fff3cd;border:1px solid #ffeeba;color:#856404;font-weight:800;">
        🎫 No coupons available for ${dayType.toUpperCase()}.
      </div>
    `;
    couponInput.placeholder = "No coupons for this date";
    return;
  }

  couponInput.placeholder = `Available: ${validCoupons[0].code}`;

  couponsDiv.innerHTML = `
    <div style="font-weight:900;margin-bottom:10px;color:#0f172a;">🎫 Available Coupons</div>
    ${validCoupons.map(c=>{
      const discountText = c.type === "percentage" ? `${c.discount}% OFF` : `${formatINR(c.discount)} OFF`;
      return `
        <div
          style="padding:10px 12px;border-radius:14px;border:1px solid rgba(15,23,42,.10);
                 background:rgba(255,255,255,.85);margin-bottom:8px;cursor:pointer;
                 font-weight:800;display:flex;justify-content:space-between;align-items:center;"
          onclick="selectCoupon('${sanitize(c.code)}')">
          <span><b>${sanitize(c.code)}</b> - ${discountText}</span>
          <span style="font-size:12px;color:#475569;">${(c.day_type || "all").toUpperCase()}</span>
        </div>
      `;
    }).join("")}
  `;
}

window.selectCoupon = function(code){
  document.getElementById("couponCode").value = String(code).toUpperCase();
  document.getElementById("applyCouponBtn").click();
};

/* ---------------------------
   Apply Coupon Button
--------------------------- */
function setupApplyCouponButton(){
  const btn = document.getElementById("applyCouponBtn");
  if(!btn) return;

  btn.addEventListener("click", function(){
    const code = document.getElementById("couponCode").value.trim().toUpperCase();
    const msg = document.getElementById("couponMessage");

    if(!code){
      msg.innerHTML = `<span style="color:#dc3545;font-weight:800;">Enter coupon code</span>`;
      return;
    }

    const coupon = window.bookingModalCoupons?.[code];
    if(!coupon){
      msg.innerHTML = `<span style="color:#dc3545;font-weight:800;">Invalid coupon for this resort/date</span>`;
      window.appliedCouponCode = null;
      window.appliedDiscountAmount = 0;
      return;
    }

    // Calculate discount based on current base amount
    const baseAmountText = document.getElementById("baseAmount").textContent;
    const totalBeforeDiscount = parseInt(baseAmountText.replace(/[^0-9]/g,"")) || 0;

    let discountAmount = 0;
    if(coupon.type === "percentage"){
      discountAmount = Math.round(totalBeforeDiscount * (coupon.discount / 100));
    }else{
      discountAmount = parseInt(coupon.discount) || 0;
    }

    window.appliedCouponCode = code;
    window.appliedDiscountAmount = discountAmount;

    msg.innerHTML = `<span style="color:#16a34a;font-weight:900;">✅ Coupon applied! Saved ${formatINR(discountAmount)}</span>`;

    // Update totals again
    const resortId = document.getElementById("resortId").value;
    const resort = window.allResorts.find(r => r.id == resortId);
    if(resort) updateBookingPricing(resort);
  });
}

/* ---------------------------
   Update pricing when dates change
--------------------------- */
function setupDateListeners(){
  const checkInEl = document.getElementById("checkIn");
  const checkOutEl = document.getElementById("checkOut");

  if(!checkInEl || !checkOutEl) return;

  function refresh(){
    const resortId = document.getElementById("resortId").value;
    const resort = window.allResorts.find(r => r.id == resortId);
    if(resort){
      // remove old coupon when changing date
      window.appliedCouponCode = null;
      window.appliedDiscountAmount = 0;
      document.getElementById("couponMessage").innerHTML = "";
      document.getElementById("discountRow").style.display = "none";
      updateBookingPricing(resort);
      showAvailableCouponsForDate(resortId);
    }
  }

  checkInEl.addEventListener("change", refresh);
  checkOutEl.addEventListener("change", refresh);
}

/* ---------------------------
   Booking Submit
--------------------------- */
window.handleBookingSubmit = async function(e){
  e.preventDefault();

  const resortId = document.getElementById("resortId").value;
  const resort = window.allResorts.find(r => r.id == resortId);

  if(!resort){
    showCriticalNotification("Resort not found", "error");
    return;
  }

  const formData = {
    resortId: resortId,
    guestName: document.getElementById("guestName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    guests: parseInt(document.getElementById("guests").value || "2")
  };

  if(!formData.guestName || !formData.email || !formData.phone){
    showCriticalNotification("Please fill all required fields", "error");
    return;
  }

  // Proceed to payment (existing system uses showPaymentInterface)
  const baseAmountText = document.getElementById("baseAmount").textContent;
  const platformFeeText = document.getElementById("platformFee").textContent;
  const totalAmountText = document.getElementById("totalAmount").textContent;

  const bookingData = {
    ...formData,
    resortName: resort.name,
    resortNote: resort.note,
    basePrice: parseInt(baseAmountText.replace(/[^0-9]/g,"")) || resort.price,
    platformFee: parseInt(platformFeeText.replace(/[^0-9]/g,"")) || 0,
    totalPrice: parseInt(totalAmountText.replace(/[^0-9]/g,"")) || resort.price,
    bookingReference: `VE${String(Date.now()).padStart(12,"0")}`,
    couponCode: window.appliedCouponCode || null,
    discountAmount: window.appliedDiscountAmount || 0
  };

  showPaymentInterface(bookingData);
  window.closeBookingModal();
};

/* ---------------------------
   Payment Interface (UPI + Card)
--------------------------- */
function showPaymentInterface(bookingData){
  const paymentModal = document.createElement("div");
  paymentModal.className = "payment-modal";
  paymentModal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);
    z-index:200000;display:flex;align-items:center;justify-content:center;
    padding:16px;
  `;

  paymentModal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:18px;max-width:520px;width:100%;position:relative;">
      <span onclick="closePaymentModal()" style="position:absolute;top:10px;right:14px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
      <h2 style="margin:0 0 10px;font-weight:900;">💳 Complete Payment</h2>

      <div style="margin:12px 0;font-weight:800;color:#0f172a;">
        <p><b>Resort:</b> ${sanitize(bookingData.resortName)}</p>
        <p><b>Guest:</b> ${sanitize(bookingData.guestName)}</p>
        <p><b>Total:</b> ${formatINR(bookingData.totalPrice)}</p>
        <p><b>Reference:</b> ${sanitize(bookingData.bookingReference)}</p>
      </div>

      <div style="margin-top:14px;">
        <div style="display:flex;margin-bottom:12px;">
          <button onclick="showPaymentMethod('upi')" id="upiTab"
            style="flex:1;padding:10px;border:2px solid #0a74da;background:#0a74da;color:white;border-radius:12px 0 0 12px;font-weight:900;cursor:pointer;">
            🔗 UPI
          </button>
          <button onclick="showPaymentMethod('card')" id="cardTab"
            style="flex:1;padding:10px;border:2px solid #0a74da;background:white;color:#0a74da;border-radius:0 12px 12px 0;font-weight:900;cursor:pointer;">
            💳 Card
          </button>
        </div>

        <div id="upiPayment" style="display:block;">
          <div style="text-align:center;margin:12px 0;">
            <img src="qr-code.png.jpeg" style="max-width:190px;border-radius:14px;border:1px solid #eee;" />
          </div>
          <p style="font-weight:800;"><b>UPI ID:</b> vizagresorts@ybl</p>

          <input type="text" id="utrInput" placeholder="Enter 12-digit UTR"
            maxlength="12"
            style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(15,23,42,.15);margin-top:10px;font-weight:800;" />

          <button onclick="confirmPayment('${bookingData.bookingReference}')"
            style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:14px;background:#16a34a;color:white;font-weight:900;cursor:pointer;">
            ✅ Confirm UPI Payment
          </button>
        </div>

        <div id="cardPayment" style="display:none;">
          <p style="font-weight:800;">Card payments via Razorpay.</p>
          <button onclick="payWithCard()"
            style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:14px;background:#6f42c1;color:white;font-weight:900;cursor:pointer;">
            💳 Pay with Card
          </button>
        </div>

      </div>

      <button onclick="closePaymentModal()"
        style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:14px;background:#dc3545;color:white;font-weight:900;cursor:pointer;">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(paymentModal);
  window.pendingBooking = bookingData;

  window.closePaymentModal = function(){
    const m = document.querySelector(".payment-modal");
    if(m) m.remove();
    document.body.style.overflow = "auto";
  };

  window.showPaymentMethod = function(method){
    document.getElementById("upiPayment").style.display = method==="upi" ? "block" : "none";
    document.getElementById("cardPayment").style.display = method==="card" ? "block" : "none";

    document.getElementById("upiTab").style.background = method==="upi" ? "#0a74da" : "white";
    document.getElementById("upiTab").style.color = method==="upi" ? "white" : "#0a74da";

    document.getElementById("cardTab").style.background = method==="card" ? "#0a74da" : "white";
    document.getElementById("cardTab").style.color = method==="card" ? "white" : "#0a74da";
  };

  window.confirmPayment = async function(){
    const utr = document.getElementById("utrInput").value.trim();

    if(!utr || !/^[0-9]{12}$/.test(utr)){
      showCriticalNotification("UTR number must be exactly 12 digits", "error");
      return;
    }

    const bookingData = window.pendingBooking;
    if(!bookingData){
      showCriticalNotification("Booking data missing", "error");
      return;
    }

    try{
      const resp = await fetch("/api/bookings", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "X-Requested-With":"XMLHttpRequest"
        },
        body: JSON.stringify({
          resortId: parseInt(bookingData.resortId),
          guestName: bookingData.guestName,
          email: bookingData.email,
          phone: bookingData.phone,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          guests: bookingData.guests,
          transactionId: utr,
          couponCode: bookingData.couponCode,
          discountAmount: bookingData.discountAmount
        })
      });

      const result = await resp.json();

      if(result.error){
        showCriticalNotification(result.error, "error");
      }else{
        showCriticalNotification("Payment submitted for verification. You will be notified via email and WhatsApp.", "success");
        window.closePaymentModal();
      }
    }catch(err){
      showCriticalNotification("Network error. Please try again.", "error");
    }
  };

  window.payWithCard = function(){
    showCriticalNotification("Card Payment integration pending (Razorpay). Use UPI for now.", "error");
  };

  document.body.style.overflow = "hidden";
}

/* ---------------------------
   Toggle Description
--------------------------- */
window.toggleDescription = function(resortId, ev){
  if(ev) ev.preventDefault();

  const shortEl = document.getElementById(`desc-short-${resortId}`);
  const fullEl = document.getElementById(`desc-full-${resortId}`);
  if(!shortEl || !fullEl) return;

  const btn = ev?.target;

  if(shortEl.style.display === "none"){
    shortEl.style.display = "block";
    fullEl.style.display = "none";
    if(btn) btn.textContent = "View More";
  }else{
    shortEl.style.display = "none";
    fullEl.style.display = "block";
    if(btn) btn.textContent = "View Less";
  }
};

/* ---------------------------
   Gallery (simple)
--------------------------- */
window.openGallery = function(resortId){
  const resort = window.allResorts.find(r=>r.id == resortId);
  if(!resort){
    showCriticalNotification("Gallery not found", "error");
    return;
  }

  const modalId = "resortGalleryModal";
  const existing = document.getElementById(modalId);
  if(existing) existing.remove();

  const galleryModal = document.createElement("div");
  galleryModal.id = modalId;
  galleryModal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center;
    z-index:10000; padding:16px;
  `;

  galleryModal.innerHTML = `
    <div style="background:white;border-radius:18px;max-width:900px;width:100%;padding:16px;position:relative;">
      <span onclick="closeResortGallery()" style="position:absolute;top:10px;right:14px;font-size:28px;cursor:pointer;color:#999;">&times;</span>
      <h2 style="margin:0 0 12px;font-weight:900;">${sanitize(resort.name)}</h2>
      <img src="${sanitize(resort.image)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:16px;" />
      <p style="margin-top:10px;color:#475569;font-weight:800;">${sanitize(resort.location)}</p>
    </div>
  `;

  document.body.appendChild(galleryModal);
  document.body.style.overflow = "hidden";

  galleryModal.addEventListener("click", (e)=>{
    if(e.target === galleryModal) window.closeResortGallery();
  });
};

window.closeResortGallery = function(){
  const m = document.getElementById("resortGalleryModal");
  if(m) m.remove();
  document.body.style.overflow = "auto";
};

/* ---------------------------
   Reviews (basic placeholders)
--------------------------- */
window.openReviewModal = function(){
  showCriticalNotification("Review system enabled in backend ✅", "success");
};
window.viewReviews = function(){
  showCriticalNotification("Reviews display coming soon ✅", "success");
};
window.closeReviewModal = function(){};
window.closeViewReviewsModal = function(){};

/* ---------------------------
   Offers Slider (Coupons UI)
--------------------------- */
async function setupOffersCouponSlider(){
  const offersSection = document.getElementById("offers");
  if(!offersSection) return;

  const container = offersSection.querySelector(".vrb-container");
  if(!container) return;

  // Create slider UI area
  const wrap = document.createElement("div");
  wrap.className = "vrb-offers-wrap";
  wrap.innerHTML = `
    <button class="vrb-offer-arrow left" id="couponLeft">‹</button>
    <div class="vrb-offers-track" id="couponTrack"></div>
    <button class="vrb-offer-arrow right" id="couponRight">›</button>
  `;
  container.appendChild(wrap);

  // Load coupons
  let coupons = [];
  try{
    coupons = await fetchCoupons();
  }catch(e){
    coupons = [];
  }

  const track = document.getElementById("couponTrack");
  if(!track) return;

  if(!coupons || coupons.length === 0){
    track.innerHTML = `<div style="padding:16px;font-weight:800;color:#475569;">No offers available right now.</div>`;
    return;
  }

  // Attach resort info
  const getResortById = (id) => window.allResorts.find(r => r.id == id);

  const cardsHTML = coupons.map(c=>{
    const code = sanitize(c.code);
    const discountText = c.type === "percentage" ? `${c.discount}% OFF` : `${formatINR(c.discount)} OFF`;

    let resortName = "All Resorts";
    let resortImg = "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200";

    if(c.resort_id){
      const rr = getResortById(c.resort_id);
      if(rr){
        resortName = rr.name;
        resortImg = rr.image || resortImg;
      }
    }

    return `
      <div class="vrb-coupon-card">
        <img class="vrb-coupon-banner" src="${sanitize(resortImg)}" alt="${sanitize(resortName)}">
        <div class="vrb-coupon-body">
          <div class="vrb-coupon-resort">${sanitize(resortName)}</div>
          <div class="vrb-coupon-meta">${discountText} • ${(c.day_type || "all").toUpperCase()}</div>

          <div class="vrb-coupon-code">
            <b>${code}</b>
            <button class="vrb-copy-btn" onclick="copyCoupon('${code}')">Copy</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  track.innerHTML = cardsHTML;

  // Slider buttons
  const left = document.getElementById("couponLeft");
  const right = document.getElementById("couponRight");

  if(left) left.onclick = ()=> track.scrollBy({left: -340, behavior:"smooth"});
  if(right) right.onclick = ()=> track.scrollBy({left: 340, behavior:"smooth"});

  // Auto rotation
  let auto = setInterval(()=>{
    track.scrollBy({left: 340, behavior:"smooth"});
    // if reached end -> reset
    if(track.scrollLeft + track.clientWidth >= track.scrollWidth - 5){
      track.scrollTo({left:0, behavior:"smooth"});
    }
  }, 4000);

  // Pause on hover
  track.addEventListener("mouseenter", ()=> clearInterval(auto));
  track.addEventListener("mouseleave", ()=> {
    auto = setInterval(()=>{
      track.scrollBy({left: 340, behavior:"smooth"});
      if(track.scrollLeft + track.clientWidth >= track.scrollWidth - 5){
        track.scrollTo({left:0, behavior:"smooth"});
      }
    }, 4000);
  });
}

window.copyCoupon = function(code){
  if(!code) return;
  navigator.clipboard.writeText(code).then(()=>{
    showCriticalNotification(`Copied: ${code}`, "success");
  }).catch(()=>{
    showCriticalNotification("Copy failed", "error");
  });
};

/* ---------------------------
   Notifications
--------------------------- */
function showCriticalNotification(message, type="success"){
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 18px;
    background: ${type === "success" ? "#16a34a" : "#dc3545"};
    color: white;
    padding: 14px 16px;
    border-radius: 14px;
    z-index: 300000;
    font-weight: 900;
    box-shadow: 0 16px 40px rgba(2,8,20,.22);
    max-width: 320px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(()=> notification.remove(), 3500);
}

/* ---------------------------
   DOM Ready Setup
--------------------------- */
async function initApp(){
  try{
    const resorts = await fetchResorts();
    window.allResorts = resorts || [];
    window.filteredResorts = [...window.allResorts];

    loadLocationsIntoHeroSearch(window.allResorts);
    renderResorts(window.allResorts);

    setupSearchButton();
    setupApplyCouponButton();
    setupDateListeners();

    console.log("✅ Resorts loaded:", window.allResorts.length);
  }catch(e){
    console.error("❌ initApp error:", e);
    const grid = document.getElementById("resortsGrid");
    if(grid){
      grid.innerHTML = `<p style="text-align:center;padding:2rem;color:#dc3545;">Failed to load resorts. Please refresh.</p>`;
    }
  }
}

// Start
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", function(){
    initBannerRotation();
    setupUniversalModalClose();
    initApp();
  });
}else{
  initBannerRotation();
  setupUniversalModalClose();
  initApp();
}
