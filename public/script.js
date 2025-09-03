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
        console.log('Loaded resorts:', resorts); // Debug log
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
            <div class="image-gallery" onclick="openResortDetails(${resort.id})" style="cursor: pointer;">
                <img src="${resort.image}" alt="${resort.name}" class="resort-image" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 200\"><rect fill=\"%23ecf0f1\" width=\"400\" height=\"200\"/><text x=\"200\" y=\"100\" text-anchor=\"middle\" fill=\"%237f8c8d\" font-size=\"16\">Resort Image</text></svg>'">
                ${(() => {
                    let images = [];
                    if (resort.images) {
                        if (typeof resort.images === 'string') {
                            try { images = JSON.parse(resort.images); } catch (e) { images = [resort.images]; }
                        } else if (Array.isArray(resort.images)) {
                            images = resort.images;
                        }
                    }
                    return images.length > 1 ? `<div class="image-count">+${images.length - 1}</div>` : '';
                })()
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

// Open resort details modal
function openResortDetails(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    // Get all images
    let images = [];
    if (resort.images) {
        if (typeof resort.images === 'string') {
            try { images = JSON.parse(resort.images); } catch (e) { images = [resort.images]; }
        } else if (Array.isArray(resort.images)) {
            images = resort.images;
        }
    }
    if (images.length === 0) images = [resort.image];
    
    // Set main image
    document.getElementById('mainResortImage').src = images[0];
    
    // Set thumbnails
    const thumbnailContainer = document.getElementById('thumbnailImages');
    thumbnailContainer.innerHTML = images.map((img, index) => 
        `<img src="${img}" alt="${resort.name}" class="thumbnail ${index === 0 ? 'active' : ''}" 
              onclick="changeMainImage('${img}', ${index})">`
    ).join('');
    
    // Set resort info
    document.getElementById('detailsResortName').textContent = resort.name;
    document.getElementById('detailsLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${resort.location}`;
    document.getElementById('detailsPrice').textContent = `₹${resort.price}/night`;
    document.getElementById('detailsDescription').textContent = resort.description;
    document.getElementById('detailsAmenities').innerHTML = resort.amenities.map(amenity => 
        `<span class="amenity">${amenity}</span>`
    ).join('');
    
    // Set book button
    document.getElementById('detailsBookBtn').onclick = () => {
        closeResortDetails();
        openBookingModal(resortId);
    };
    
    // Show modal
    document.getElementById('resortDetailsModal').style.display = 'block';
}

// Change main image in details modal
function changeMainImage(src, index) {
    document.getElementById('mainResortImage').src = src;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    document.querySelectorAll('.thumbnail')[index].classList.add('active');
}

// Close resort details modal
function closeResortDetails() {
    document.getElementById('resortDetailsModal').style.display = 'none';
}

// Open booking from details
function openBookingFromDetails() {
    const resortId = parseInt(document.getElementById('detailsBookBtn').getAttribute('data-resort-id'));
    closeResortDetails();
    openBookingModal(resortId);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    const detailsModal = document.getElementById('resortDetailsModal');
    
    if (event.target === bookingModal) {
        bookingModal.style.display = 'none';
    }
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
}