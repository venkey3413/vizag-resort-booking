// Socket.IO connection for real-time updates
const socket = io();

// Global variables
let resorts = [];
let discountCodes = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calendarBookings = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    loadResorts();
    loadDiscountCodes();
    loadCalendarBookings();
    
    // Set up form handlers
    document.getElementById('addResortForm').addEventListener('submit', handleAddResort);
    document.getElementById('editResortForm').addEventListener('submit', handleEditResort);
    document.getElementById('addDiscountForm').addEventListener('submit', handleAddDiscountCode);
});

// Socket event listeners for real-time updates
socket.on('connect', () => {
    console.log('Connected to admin server');
});

socket.on('resortAdded', (resort) => {
    console.log('Resort added:', resort);
    loadResorts();
    loadDashboard();
});

socket.on('resortUpdated', (resort) => {
    console.log('Resort updated:', resort);
    loadResorts();
    loadDashboard();
});

socket.on('resortDeleted', (data) => {
    console.log('Resort deleted:', data);
    loadResorts();
    loadDashboard();
});

socket.on('bookingCreated', (booking) => {
    console.log('Booking created:', booking);
    loadDashboard();
    loadCalendarBookings();
});

socket.on('bookingDeleted', (data) => {
    console.log('Booking deleted:', data);
    loadDashboard();
    loadCalendarBookings();
});

// Tab management
function showTab(tabName, event) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab and mark button as active
    document.getElementById(tabName).classList.add('active');
    if (event) event.target.classList.add('active');
    
    // Load data based on tab
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'calendar':
            loadCalendarBookings();
            break;
        case 'manage-resorts':
            loadResorts();
            break;
        case 'discount-codes':
            loadDiscountCodes();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const response = await fetch('/api/analytics/dashboard');
        const data = await response.json();
        
        document.getElementById('totalResorts').textContent = data.totalResorts;
        document.getElementById('totalBookings').textContent = data.totalBookings;
        document.getElementById('totalRevenue').textContent = `₹${data.totalRevenue.toLocaleString()}`;
        document.getElementById('todayBookings').textContent = data.todayBookings;
        
        // Update location stats
        const locationStats = document.getElementById('locationStats');
        locationStats.innerHTML = data.locationStats.map(stat => `
            <div class="location-stat">
                <span class="location-name">${stat.location}</span>
                <span class="location-count">${stat.count} bookings</span>
            </div>
        `).join('');
        
        // Update recent bookings
        const recentBookings = document.getElementById('recentBookingsList');
        recentBookings.innerHTML = data.recentBookings.map(booking => `
            <div class="booking-item">
                <div class="booking-info">
                    <strong>${booking.guest_name}</strong>
                    <span>${booking.resort_name}</span>
                </div>
                <div class="booking-amount">₹${booking.total_price}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// Resort management functions
async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
        showNotification('Failed to load resorts', 'error');
    }
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <div class="resort-header">
                <h3>${resort.name}</h3>
                <div class="resort-actions">
                    <button onclick="editResort(${resort.id})" class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteResort(${resort.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="resort-info">
                <p><i class="fas fa-map-marker-alt"></i> ${resort.location}</p>
                <p><i class="fas fa-rupee-sign"></i> ₹${resort.price}/night</p>
                <p><i class="fas fa-users"></i> Max ${resort.max_guests || 10} guests</p>
                ${resort.map_link ? `<p><a href="${resort.map_link}" target="_blank"><i class="fas fa-map"></i> View on Map</a></p>` : ''}
            </div>
            <div class="resort-description">
                <p>${resort.description}</p>
            </div>
            ${resort.amenities && resort.amenities.length > 0 ? `
                <div class="resort-amenities">
                    ${resort.amenities.map(amenity => `<span class="amenity-tag">${amenity}</span>`).join('')}
                </div>
            ` : ''}
            ${resort.images && resort.images.length > 0 ? `
                <div class="resort-images">
                    <img src="${resort.images[0]}" alt="${resort.name}" onerror="this.style.display='none'">
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function handleAddResort(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const resortData = {
        name: formData.get('name'),
        location: formData.get('location'),
        price: parseInt(formData.get('price')),
        peakPrice: formData.get('peakPrice') ? parseInt(formData.get('peakPrice')) : null,
        offPeakPrice: formData.get('offPeakPrice') ? parseInt(formData.get('offPeakPrice')) : null,
        peakStart: formData.get('peakStart'),
        peakEnd: formData.get('peakEnd'),
        description: formData.get('description'),
        amenities: formData.get('amenities') ? formData.get('amenities').split(',').map(a => a.trim()) : [],
        images: formData.get('imageUrls') ? formData.get('imageUrls').split('\\n').filter(url => url.trim()) : [],
        videos: formData.get('videoUrls') ? formData.get('videoUrls').split('\\n').filter(url => url.trim()) : [],
        maxGuests: parseInt(formData.get('maxGuests')) || 10,
        perHeadCharge: parseInt(formData.get('perHeadCharge')) || 300,
        mapLink: formData.get('mapLink')
    };
    
    try {
        const response = await fetch('/api/resorts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resortData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Resort added successfully!', 'success');
            event.target.reset();
            loadResorts();
        } else {
            showNotification(result.error || 'Failed to add resort', 'error');
        }
    } catch (error) {
        console.error('Error adding resort:', error);
        showNotification('Failed to add resort', 'error');
    }
}

function editResort(id) {
    const resort = resorts.find(r => r.id === id);
    if (!resort) return;
    
    document.getElementById('editResortId').value = resort.id;
    document.getElementById('editName').value = resort.name;
    document.getElementById('editLocation').value = resort.location;
    document.getElementById('editPrice').value = resort.price;
    document.getElementById('editPeakPrice').value = resort.peak_price || '';
    document.getElementById('editOffPeakPrice').value = resort.off_peak_price || '';
    document.getElementById('editPeakStart').value = resort.peak_season_start || '';
    document.getElementById('editPeakEnd').value = resort.peak_season_end || '';
    document.getElementById('editDescription').value = resort.description;
    document.getElementById('editAmenities').value = resort.amenities ? resort.amenities.join(', ') : '';
    document.getElementById('editImageUrls').value = resort.images ? resort.images.join('\\n') : '';
    document.getElementById('editVideoUrls').value = resort.videos ? resort.videos.join('\\n') : '';
    document.getElementById('editMaxGuests').value = resort.max_guests || 10;
    document.getElementById('editPerHeadCharge').value = resort.per_head_charge || 300;
    document.getElementById('editMapLink').value = resort.map_link || '';
    
    document.getElementById('editModal').style.display = 'block';
}

async function handleEditResort(event) {
    event.preventDefault();
    
    const id = document.getElementById('editResortId').value;
    const resortData = {
        name: document.getElementById('editName').value,
        location: document.getElementById('editLocation').value,
        price: parseInt(document.getElementById('editPrice').value),
        peakPrice: document.getElementById('editPeakPrice').value ? parseInt(document.getElementById('editPeakPrice').value) : null,
        offPeakPrice: document.getElementById('editOffPeakPrice').value ? parseInt(document.getElementById('editOffPeakPrice').value) : null,
        peakStart: document.getElementById('editPeakStart').value,
        peakEnd: document.getElementById('editPeakEnd').value,
        description: document.getElementById('editDescription').value,
        amenities: document.getElementById('editAmenities').value ? document.getElementById('editAmenities').value.split(',').map(a => a.trim()) : [],
        images: document.getElementById('editImageUrls').value ? document.getElementById('editImageUrls').value.split('\\n').filter(url => url.trim()) : [],
        videos: document.getElementById('editVideoUrls').value ? document.getElementById('editVideoUrls').value.split('\\n').filter(url => url.trim()) : [],
        maxGuests: parseInt(document.getElementById('editMaxGuests').value) || 10,
        perHeadCharge: parseInt(document.getElementById('editPerHeadCharge').value) || 300,
        mapLink: document.getElementById('editMapLink').value
    };
    
    try {
        const response = await fetch(`/api/resorts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resortData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Resort updated successfully!', 'success');
            closeEditModal();
            loadResorts();
        } else {
            showNotification(result.error || 'Failed to update resort', 'error');
        }
    } catch (error) {
        console.error('Error updating resort:', error);
        showNotification('Failed to update resort', 'error');
    }
}

async function deleteResort(id) {
    if (!confirm('Are you sure you want to delete this resort?')) return;
    
    try {
        const response = await fetch(`/api/resorts/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Resort deleted successfully!', 'success');
            loadResorts();
        } else {
            showNotification(result.error || 'Failed to delete resort', 'error');
        }
    } catch (error) {
        console.error('Error deleting resort:', error);
        showNotification('Failed to delete resort', 'error');
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Discount codes functions
async function loadDiscountCodes() {
    try {
        const response = await fetch('/api/discount-codes');
        discountCodes = await response.json();
        displayDiscountCodes();
    } catch (error) {
        console.error('Error loading discount codes:', error);
        showNotification('Failed to load discount codes', 'error');
    }
}

function displayDiscountCodes() {
    const grid = document.getElementById('discountCodesGrid');
    grid.innerHTML = discountCodes.map(code => `
        <div class="resort-card">
            <div class="resort-header">
                <h3>${code.code}</h3>
                <div class="resort-actions">
                    <button onclick="deleteDiscountCode(${code.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="resort-info">
                <p><i class="fas fa-percentage"></i> ${code.discount_type === 'percentage' ? code.discount_value + '%' : '₹' + code.discount_value}</p>
                <p><i class="fas fa-rupee-sign"></i> Min: ₹${code.min_amount}</p>
                ${code.max_uses ? `<p><i class="fas fa-users"></i> Max uses: ${code.max_uses}</p>` : '<p><i class="fas fa-infinity"></i> Unlimited uses</p>'}
                ${code.valid_until ? `<p><i class="fas fa-calendar"></i> Valid until: ${new Date(code.valid_until).toLocaleDateString()}</p>` : ''}
            </div>
        </div>
    `).join('');
}

async function handleAddDiscountCode(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const codeData = {
        code: formData.get('code'),
        discountType: formData.get('discountType'),
        discountValue: parseInt(formData.get('discountValue')),
        minAmount: parseInt(formData.get('minAmount')) || 0,
        maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses')) : null,
        validUntil: formData.get('validUntil') || null
    };
    
    try {
        const response = await fetch('/api/discount-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(codeData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Discount code created successfully!', 'success');
            event.target.reset();
            loadDiscountCodes();
        } else {
            showNotification(result.error || 'Failed to create discount code', 'error');
        }
    } catch (error) {
        console.error('Error creating discount code:', error);
        showNotification('Failed to create discount code', 'error');
    }
}

async function deleteDiscountCode(id) {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
        const response = await fetch(`/api/discount-codes/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Discount code deleted successfully!', 'success');
            loadDiscountCodes();
        } else {
            showNotification('Failed to delete discount code', 'error');
        }
    } catch (error) {
        console.error('Error deleting discount code:', error);
        showNotification('Failed to delete discount code', 'error');
    }
}

// Calendar functions
async function loadCalendarBookings() {
    try {
        const response = await fetch('/api/calendar/bookings');
        calendarBookings = await response.json();
        renderCalendar();
    } catch (error) {
        console.error('Error loading calendar bookings:', error);
        showNotification('Failed to load calendar data', 'error');
    }
}

function renderCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    document.getElementById('currentMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayBookings = calendarBookings.filter(booking => 
            booking.check_in <= dateStr && booking.check_out >= dateStr
        );
        
        if (dayBookings.length > 0) {
            dayElement.classList.add('has-bookings');
            dayElement.title = `${dayBookings.length} booking(s)`;
        }
        
        calendarDays.appendChild(dayElement);
    }
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Export functions
async function exportData(type, format) {
    try {
        const response = await fetch(`/api/export/${type}?format=${format}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showNotification(`${type} exported successfully!`, 'success');
        } else {
            showNotification(`Failed to export ${type}`, 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification(`Failed to export ${type}`, 'error');
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}