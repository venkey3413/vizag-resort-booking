let resorts = [];
let bookings = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    loadBookings();
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
    document.getElementById('addResortForm').addEventListener('submit', handleAddResort);
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
    document.getElementById('editResortForm').addEventListener('submit', handleEditResort);
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
        displayManageResorts();
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
            <img src="${resort.image}" alt="${resort.name}" class="resort-image" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 200\"><rect fill=\"%23ecf0f1\" width=\"400\" height=\"200\"/><text x=\"200\" y=\"100\" text-anchor=\"middle\" fill=\"%237f8c8d\" font-size=\"16\">Resort Image</text></svg>'">
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location"><i class="fas fa-map-marker-alt"></i> ${resort.location}</p>
                <p class="resort-price">₹${resort.price}/night</p>
                <p class="resort-description">${resort.description}</p>
                <div class="amenities">
                    ${resort.amenities.map(amenity => `<span class="amenity">${amenity}</span>`).join('')}
                </div>
                <button class="book-btn" onclick="openBookingModal(${resort.id})">
                    <i class="fas fa-calendar-check"></i> Book Now
                </button>
            </div>
        </div>
    `).join('');
}

// Display resorts in manage section
function displayManageResorts() {
    const grid = document.getElementById('manageResortsGrid');
    
    grid.innerHTML = resorts.map(resort => `
        <div class="manage-card">
            <div>
                <h4>${resort.name}</h4>
                <p>${resort.location} - ₹${resort.price}/night</p>
            </div>
            <div class="manage-actions">
                <button class="edit-btn" onclick="openEditModal(${resort.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteResort(${resort.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
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

// Handle add resort form
async function handleAddResort(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/resorts', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('Resort added successfully!');
            e.target.reset();
            loadResorts();
        } else {
            alert('Error adding resort');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding resort');
    }
}

// Open booking modal
function openBookingModal(resortId) {
    const modal = document.getElementById('bookingModal');
    document.getElementById('bookingResortId').value = resortId;
    modal.style.display = 'block';
}

// Close booking modal
function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
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
            loadBookings();
        } else {
            alert('Error creating booking');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating booking');
    }
}

// Open edit modal
function openEditModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    document.getElementById('editResortId').value = resort.id;
    document.getElementById('editName').value = resort.name;
    document.getElementById('editLocation').value = resort.location;
    document.getElementById('editPrice').value = resort.price;
    document.getElementById('editDescription').value = resort.description;
    document.getElementById('editAmenities').value = resort.amenities.join(', ');
    
    document.getElementById('editModal').style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Handle edit resort form
async function handleEditResort(e) {
    e.preventDefault();
    
    const resortId = document.getElementById('editResortId').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('editName').value);
    formData.append('location', document.getElementById('editLocation').value);
    formData.append('price', document.getElementById('editPrice').value);
    formData.append('description', document.getElementById('editDescription').value);
    formData.append('amenities', document.getElementById('editAmenities').value);
    
    const imageFile = document.getElementById('editImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const response = await fetch(`/api/resorts/${resortId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            alert('Resort updated successfully!');
            closeEditModal();
            loadResorts();
        } else {
            alert('Error updating resort');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating resort');
    }
}

// Delete resort
async function deleteResort(resortId) {
    if (!confirm('Are you sure you want to delete this resort?')) return;
    
    try {
        const response = await fetch(`/api/resorts/${resortId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Resort deleted successfully!');
            loadResorts();
        } else {
            alert('Error deleting resort');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting resort');
    }
}

// Load bookings
async function loadBookings() {
    try {
        const response = await fetch('/api/bookings');
        bookings = await response.json();
        displayBookings();
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Display bookings
function displayBookings() {
    const container = document.getElementById('bookingsTable');
    
    if (bookings.length === 0) {
        container.innerHTML = '<p>No bookings found.</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Booking ID</th>
                    <th>Guest Name</th>
                    <th>Resort</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Guests</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>#${booking.id}</td>
                        <td>${booking.guestName}</td>
                        <td>${booking.resortName}</td>
                        <td>${new Date(booking.checkIn).toLocaleDateString()}</td>
                        <td>${new Date(booking.checkOut).toLocaleDateString()}</td>
                        <td>${booking.guests}</td>
                        <td>₹${booking.totalPrice}</td>
                        <td><span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 3px;">${booking.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Show tab
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
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

// Close modals when clicking outside
window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === bookingModal) {
        bookingModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
}