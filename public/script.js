let resorts = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Forms
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Load resorts from API
async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        displayResorts();
        populateLocationFilter();
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

// Display resorts in grid
function displayResorts(filteredResorts = resorts) {
    const grid = document.getElementById('resortsGrid');
    
    if (filteredResorts.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No resorts found.</p>';
        return;
    }
    
    grid.innerHTML = filteredResorts.map(resort => `
        <div class="resort-card">
            <div class="image-gallery">
                ${resort.images && resort.images.length > 1 ? 
                    `<div class="image-slider">
                        ${resort.images.map((img, index) => 
                            `<img src="${img}" alt="${resort.name}" class="resort-image ${index === 0 ? 'active' : ''}" 
                                 onclick="showImage(this, ${resort.id})" 
                                 onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 200\"><rect fill=\"%23ecf0f1\" width=\"400\" height=\"200\"/><text x=\"200\" y=\"100\" text-anchor=\"middle\" fill=\"%237f8c8d\" font-size=\"16\">Resort Image</text></svg>'">`
                        ).join('')}
                        <div class="image-dots">
                            ${resort.images.map((_, index) => 
                                `<span class="dot ${index === 0 ? 'active' : ''}" onclick="currentSlide(${index + 1}, ${resort.id})"></span>`
                            ).join('')}
                        </div>
                    </div>` :
                    `<img src="${resort.image}" alt="${resort.name}" class="resort-image" 
                         onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 200\"><rect fill=\"%23ecf0f1\" width=\"400\" height=\"200\"/><text x=\"200\" y=\"100\" text-anchor=\"middle\" fill=\"%237f8c8d\" font-size=\"16\">Resort Image</text></svg>'">`
                }
            </div>
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location"><i class="fas fa-map-marker-alt"></i> ${resort.location}</p>
                <p class="resort-price">₹${resort.price}/night</p>
                <p class="resort-description">${resort.description}</p>
                <div class="amenities">
                    ${resort.amenities.map(amenity => `<span class="amenity">${amenity}</span>`).join('')}
                </div>
                ${resort.available ? 
                    `<button class="book-btn" onclick="openBookingModal(${resort.id})">
                        <i class="fas fa-calendar-check"></i> Book Now
                    </button>` : 
                    `<button class="book-btn unavailable" disabled>
                        <i class="fas fa-times-circle"></i> Currently Unavailable
                    </button>`
                }
            </div>
        </div>
    `).join('');
}



// Populate location filter
function populateLocationFilter() {
    const filter = document.getElementById('locationFilter');
    const locations = [...new Set(resorts.map(resort => resort.location))];
    
    filter.innerHTML = '<option value="">All Locations</option>' + 
        locations.map(location => `<option value="${location}">${location}</option>`).join('');
}

// Filter resorts
function filterResorts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value;
    
    const filtered = resorts.filter(resort => {
        const matchesSearch = resort.name.toLowerCase().includes(searchTerm) || 
                            resort.location.toLowerCase().includes(searchTerm) ||
                            resort.description.toLowerCase().includes(searchTerm);
        const matchesLocation = !locationFilter || resort.location === locationFilter;
        
        return matchesSearch && matchesLocation;
    });
    
    displayResorts(filtered);
}



// Open booking modal
function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const modal = document.getElementById('bookingModal');
    document.getElementById('bookingResortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    document.getElementById('pricePerNight').textContent = `₹${resort.price}`;
    
    // Set max guests limit
    const guestsInput = document.getElementById('guests');
    const maxGuests = resort.max_guests || 20;
    guestsInput.max = maxGuests;
    document.getElementById('maxGuestsCount').textContent = maxGuests;
    document.getElementById('perHeadCharge').textContent = resort.per_head_charge || 300;
    
    calculateTotal();
    modal.style.display = 'block';
}

// Calculate total amount
function calculateTotal() {
    const resortId = parseInt(document.getElementById('bookingResortId').value);
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const basePrice = resort.price;
    const perHeadCharge = resort.per_head_charge || 300;
    const guests = parseInt(document.getElementById('guests').value) || 1;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    let nights = 1;
    if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const timeDiff = endDate.getTime() - startDate.getTime();
        nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    }
    
    // Base price covers up to 10 guests, charge extra for guests above 10
    const extraGuests = Math.max(0, guests - 10);
    const total = (basePrice + (extraGuests * perHeadCharge)) * nights;
    
    if (guests <= 10) {
        document.getElementById('pricePerNight').textContent = `₹${basePrice} (up to 10 guests)`;
    } else {
        document.getElementById('pricePerNight').textContent = `₹${basePrice} + ₹${perHeadCharge} × ${extraGuests} extra guests`;
    }
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
}

// Close booking modal
function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
    document.getElementById('totalAmount').textContent = '₹0';
}

// Handle booking form
async function handleBooking(e) {
    e.preventDefault();
    
    const formData = {
        resortId: document.getElementById('bookingResortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        guests: document.getElementById('guests').value
    };
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const booking = await response.json();
            alert(`Booking confirmed! Total: ₹${booking.totalPrice}`);
            closeModal();
            document.getElementById('bookingForm').reset();
        } else {
            const errorData = await response.json();
            alert(errorData.error || 'Error creating booking');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating booking');
    }
}





// Set minimum date for booking
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').min = today;
    document.getElementById('checkOut').min = today;
    
    // Update checkout min date when checkin changes
    document.getElementById('checkIn').addEventListener('change', function() {
        document.getElementById('checkOut').min = this.value;
    });
}

// Image slider functions
function showImage(img, resortId) {
    const card = img.closest('.resort-card');
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    images.forEach(image => image.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    img.classList.add('active');
    const index = Array.from(images).indexOf(img);
    if (dots[index]) dots[index].classList.add('active');
}

function currentSlide(n, resortId) {
    const card = document.querySelector(`[data-resort-id="${resortId}"]`) || document.querySelector('.resort-card');
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    images.forEach(image => image.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    if (images[n-1]) images[n-1].classList.add('active');
    if (dots[n-1]) dots[n-1].classList.add('active');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    
    if (event.target === bookingModal) {
        bookingModal.style.display = 'none';
    }
}