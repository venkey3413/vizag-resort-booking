let resorts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
});

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

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

function displayResorts(filteredResorts = resorts) {
    const grid = document.getElementById('resortsGrid');
    
    if (filteredResorts.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: white; font-size: 1.2rem;">No resorts found.</p>';
        return;
    }
    
    grid.innerHTML = filteredResorts.map(resort => `
        <div class="resort-card" data-resort-id="${resort.id}">
            <div class="image-gallery">
                <div class="image-slider" onclick="openResortDetails(${resort.id})">
                    ${(() => {
                        if (resort.images && resort.images.length > 0) {
                            return resort.images.map((img, index) => 
                                `<img src="${img}" alt="${resort.name}" class="resort-image ${index === 0 ? 'active' : ''}" data-resort="${resort.id}" data-index="${index}">`
                            ).join('');
                        }
                        return '<img src="data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 400 200\\"><rect fill=\\"%23ecf0f1\\" width=\\"400\\" height=\\"200\\"/><text x=\\"200\\" y=\\"100\\" text-anchor=\\"middle\\" fill=\\"%237f8c8d\\" font-size=\\"16\\">No Image</text></svg>" alt="${resort.name}" class="resort-image active">';
                    })()}
                </div>
                ${resort.images && resort.images.length > 1 ? `
                    <button class="image-navigation prev-nav" onclick="changeCardImage(${resort.id}, -1, event)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="image-navigation next-nav" onclick="changeCardImage(${resort.id}, 1, event)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="image-dots">
                        ${resort.images.map((_, index) => 
                            `<span class="dot ${index === 0 ? 'active' : ''}" onclick="setCardImage(${resort.id}, ${index}, event)"></span>`
                        ).join('')}
                    </div>
                    <div class="image-count">${resort.images.length} photos</div>
                ` : ''}
            </div>
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location"><i class="fas fa-map-marker-alt"></i> ${resort.location}</p>
                <p class="resort-price">₹${resort.price.toLocaleString()}/night</p>
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

// Inline image browsing functions
function changeCardImage(resortId, direction, event) {
    event.stopPropagation();
    const card = document.querySelector(`[data-resort-id="${resortId}"]`);
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    let currentIndex = 0;
    images.forEach((img, index) => {
        if (img.classList.contains('active')) {
            currentIndex = index;
        }
        img.classList.remove('active');
    });
    
    dots.forEach(dot => dot.classList.remove('active'));
    
    currentIndex += direction;
    if (currentIndex >= images.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = images.length - 1;
    
    images[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
}

function setCardImage(resortId, index, event) {
    event.stopPropagation();
    const card = document.querySelector(`[data-resort-id="${resortId}"]`);
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    images.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    images[index].classList.add('active');
    dots[index].classList.add('active');
}

function populateLocationFilter() {
    const filter = document.getElementById('locationFilter');
    const locations = [...new Set(resorts.map(resort => resort.location))];
    
    filter.innerHTML = '<option value="">All Locations</option>' + 
        locations.map(location => `<option value="${location}">${location}</option>`).join('');
}

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

function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const modal = document.getElementById('bookingModal');
    document.getElementById('bookingResortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    document.getElementById('pricePerNight').textContent = `₹${resort.price.toLocaleString()}`;
    
    const guestsInput = document.getElementById('guests');
    const maxGuests = resort.max_guests || 20;
    guestsInput.max = maxGuests;
    document.getElementById('maxGuestsCount').textContent = maxGuests;
    document.getElementById('perHeadCharge').textContent = resort.per_head_charge || 300;
    
    calculateTotal();
    modal.style.display = 'block';
}

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
    
    const extraGuests = Math.max(0, guests - 10);
    const total = (basePrice + (extraGuests * perHeadCharge)) * nights;
    
    if (guests <= 10) {
        document.getElementById('pricePerNight').textContent = `₹${basePrice.toLocaleString()} (up to 10 guests)`;
    } else {
        document.getElementById('pricePerNight').textContent = `₹${basePrice.toLocaleString()} + ₹${perHeadCharge.toLocaleString()} × ${extraGuests} extra guests`;
    }
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
    document.getElementById('totalAmount').textContent = '₹0';
}

async function handleBooking(e) {
    e.preventDefault();
    
    const phoneInput = document.getElementById('phone').value;
    
    // Validate phone number
    if (!/^[0-9]{10}$/.test(phoneInput)) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }
    
    const formData = {
        resortId: document.getElementById('bookingResortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: '+91' + phoneInput,
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
            alert(`🎉 BOOKING CONFIRMED!\n\nTotal Amount: ₹${booking.totalPrice.toLocaleString()}\n\nYOUR BOOKING DETAILS WILL BE SHARED TO YOUR WHATSAPP NUMBER.\n\nThank you for choosing us!`);
            closeModal();
            document.getElementById('bookingForm').reset();
        } else {
            const errorData = await response.json();
            alert('Booking failed. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Booking failed. Please check your connection and try again.');
    }
}

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').min = today;
    document.getElementById('checkOut').min = today;
    
    document.getElementById('checkIn').addEventListener('change', function() {
        document.getElementById('checkOut').min = this.value;
    });
    
    // Phone number validation
    document.getElementById('phone').addEventListener('input', function(e) {
        // Only allow numbers
        this.value = this.value.replace(/[^0-9]/g, '');
        // Limit to 10 digits
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });
}

let currentResortImages = [];
let currentImageIndex = 0;

function openResortDetails(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    currentResortImages = [];
    if (resort.images && Array.isArray(resort.images) && resort.images.length > 0) {
        currentResortImages = resort.images;
    } else {
        currentResortImages = ['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="%23ecf0f1" width="400" height="200"/><text x="200" y="100" text-anchor="middle" fill="%237f8c8d" font-size="16">No Image Available</text></svg>'];
    }
    
    currentImageIndex = 0;
    updateMainImage();
    
    const thumbnailContainer = document.getElementById('thumbnailImages');
    thumbnailContainer.innerHTML = currentResortImages.map((img, index) => 
        `<img src="${img}" alt="${resort.name}" class="thumbnail ${index === 0 ? 'active' : ''}" 
              onclick="changeMainImage(${index})">`
    ).join('');
    
    document.getElementById('totalImages').textContent = currentResortImages.length;
    document.getElementById('detailsResortName').textContent = resort.name;
    document.getElementById('detailsLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${resort.location}`;
    document.getElementById('detailsPrice').textContent = `₹${resort.price.toLocaleString()}/night`;
    document.getElementById('detailsDescription').textContent = resort.description;
    document.getElementById('detailsAmenities').innerHTML = resort.amenities.map(amenity => 
        `<span class="amenity">${amenity}</span>`
    ).join('');
    
    document.getElementById('detailsBookBtn').onclick = () => {
        closeResortDetails();
        openBookingModal(resortId);
    };
    
    document.getElementById('resortDetailsModal').style.display = 'block';
}

function updateMainImage() {
    document.getElementById('mainResortImage').src = currentResortImages[currentImageIndex];
    document.getElementById('currentImageIndex').textContent = currentImageIndex + 1;
    
    document.querySelectorAll('.thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentImageIndex);
    });
}

function changeMainImage(index) {
    currentImageIndex = index;
    updateMainImage();
}

function previousImage() {
    currentImageIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentResortImages.length - 1;
    updateMainImage();
}

function nextImage() {
    currentImageIndex = currentImageIndex < currentResortImages.length - 1 ? currentImageIndex + 1 : 0;
    updateMainImage();
}

function closeResortDetails() {
    document.getElementById('resortDetailsModal').style.display = 'none';
}

function openBookingFromDetails() {
    const resortId = parseInt(document.getElementById('detailsBookBtn').getAttribute('data-resort-id'));
    closeResortDetails();
    openBookingModal(resortId);
}

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