// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('ownerToken');
    const ownerData = localStorage.getItem('ownerData');
    
    if (!token || !ownerData) {
        window.location.href = 'login.html';
        return;
    }
    
    const owner = JSON.parse(ownerData);
    document.getElementById('ownerName').textContent = owner.name;
    
    initializeDashboard();
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');
    window.location.href = 'login.html';
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        // Load tab-specific data
        if (tabName === 'availability') {
            loadResorts();
            loadBlockedDates();
        } else if (tabName === 'bookings') {
            loadBookings();
        }
    });
});

// Modal functionality
const modal = document.getElementById('blockDateModal');
const blockDateBtn = document.getElementById('blockDateBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.cancel-btn');

blockDateBtn.addEventListener('click', function() {
    modal.style.display = 'block';
    loadResortsForModal();
});

closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
});

cancelBtn.addEventListener('click', function() {
    modal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Block date form submission
document.getElementById('blockDateForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const resortId = document.getElementById('resortSelect').value;
    const date = document.getElementById('blockDate').value;
    const reason = document.getElementById('blockReason').value;
    
    try {
        const response = await fetch('/api/owner/block-date', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('ownerToken')}`
            },
            body: JSON.stringify({ resortId, date, reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Date blocked successfully!');
            modal.style.display = 'none';
            document.getElementById('blockDateForm').reset();
            loadBlockedDates();
        } else {
            alert(data.error || 'Failed to block date');
        }
    } catch (error) {
        alert('Failed to block date. Please try again.');
    }
});

// Initialize dashboard
async function initializeDashboard() {
    loadResorts();
    loadBlockedDates();
}



// Load owner's resorts
async function loadResorts() {
    try {
        const response = await fetch('/api/owner/resorts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('ownerToken')}`
            }
        });
        
        const resorts = await response.json();
        displayResorts(resorts);
    } catch (error) {
        console.error('Failed to load resorts:', error);
    }
}

// Display resorts
function displayResorts(resorts) {
    const grid = document.getElementById('resortsGrid');
    
    if (resorts.length === 0) {
        grid.innerHTML = '<p>No resorts assigned to you.</p>';
        return;
    }
    
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <h3>${resort.name}</h3>
            <p><strong>Location:</strong> ${resort.location}</p>
            <p><strong>Description:</strong> ${resort.description}</p>
            <div class="resort-price">₹${resort.price.toLocaleString()}/night</div>
        </div>
    `).join('');
}

// Load resorts for modal dropdown
async function loadResortsForModal() {
    try {
        const response = await fetch('/api/owner/resorts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('ownerToken')}`
            }
        });
        
        const resorts = await response.json();
        const select = document.getElementById('resortSelect');
        
        select.innerHTML = '<option value="">Choose a resort...</option>' +
            resorts.map(resort => `<option value="${resort.id}">${resort.name}</option>`).join('');
    } catch (error) {
        console.error('Failed to load resorts for modal:', error);
    }
}

// Load blocked dates
async function loadBlockedDates() {
    try {
        const response = await fetch('/api/owner/blocked-dates', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('ownerToken')}`
            }
        });
        
        const blockedDates = await response.json();
        displayBlockedDates(blockedDates);
    } catch (error) {
        console.error('Failed to load blocked dates:', error);
    }
}

// Display blocked dates
function displayBlockedDates(blockedDates) {
    const list = document.getElementById('blockedDatesList');
    
    if (blockedDates.length === 0) {
        list.innerHTML = '<p>No blocked dates.</p>';
        return;
    }
    
    list.innerHTML = blockedDates.map(block => `
        <div class="blocked-date-item">
            <div class="blocked-date-info">
                <h4>${block.resort_name}</h4>
                <p><strong>Date:</strong> ${new Date(block.blocked_date).toLocaleDateString('en-IN')}</p>
                <p><strong>Reason:</strong> ${block.reason || 'No reason provided'}</p>
                <p><strong>Blocked on:</strong> ${new Date(block.created_at).toLocaleDateString('en-IN')}</p>
            </div>
            <button class="unblock-btn" onclick="unblockDate(${block.id})">Unblock</button>
        </div>
    `).join('');
}

// Unblock date
async function unblockDate(blockId) {
    if (!confirm('Are you sure you want to unblock this date?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/owner/unblock-date/${blockId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('ownerToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Date unblocked successfully!');
            loadBlockedDates();
        } else {
            alert(data.error || 'Failed to unblock date');
        }
    } catch (error) {
        alert('Failed to unblock date. Please try again.');
    }
}

// Load bookings
async function loadBookings() {
    try {
        const response = await fetch('/api/owner/bookings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('ownerToken')}`
            }
        });
        
        const bookings = await response.json();
        displayBookings(bookings);
    } catch (error) {
        console.error('Failed to load bookings:', error);
    }
}

// Display bookings
function displayBookings(bookings) {
    const list = document.getElementById('bookingsList');
    
    if (bookings.length === 0) {
        list.innerHTML = '<div class="booking-item"><p>No bookings found for your resorts.</p></div>';
        return;
    }
    
    list.innerHTML = bookings.map(booking => `
        <div class="booking-item">
            <div class="booking-header">
                <div class="booking-id">#${booking.booking_ref}</div>
                <div class="booking-status status-${booking.payment_status === 'paid' ? 'paid' : 'pending'}">
                    ${booking.payment_status === 'paid' ? 'Confirmed' : 'Pending'}
                </div>
            </div>
            <div class="booking-details">
                <div><strong>Resort:</strong> ${booking.resort_name}</div>
                <div><strong>Guest:</strong> ${booking.guest_name}</div>
                <div><strong>Email:</strong> ${booking.email}</div>
                <div><strong>Phone:</strong> ${booking.phone}</div>
                <div><strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleDateString('en-IN')}</div>
                <div><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString('en-IN')}</div>
                <div><strong>Guests:</strong> ${booking.guests}</div>
                <div><strong>Amount:</strong> ₹${booking.total_price.toLocaleString()}</div>
                <div><strong>Booked:</strong> ${new Date(booking.booking_date).toLocaleDateString('en-IN')}</div>
            </div>
        </div>
    `).join('');
}

// Set minimum date to today for date picker
document.getElementById('blockDate').min = new Date().toISOString().split('T')[0];