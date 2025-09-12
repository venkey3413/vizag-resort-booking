let resorts = [];
let csrfToken = '';

document.addEventListener('DOMContentLoaded', function() {
    getCSRFToken();
    loadDashboard();
    loadResorts();
    setupEventListeners();
    initCalendar();
});

let currentDate = new Date();
let calendarBookings = [];

function initCalendar() {
    loadCalendarData();
    renderCalendar();
}

async function loadCalendarData() {
    try {
        const response = await fetch('/api/calendar/bookings');
        calendarBookings = await response.json();
        renderCalendar();
    } catch (error) {
        console.error('Error loading calendar data:', error);
    }
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, true, year, month - 1);
        calendarDays.appendChild(dayElement);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, false, year, month);
        calendarDays.appendChild(dayElement);
    }
    
    // Next month days
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 rows × 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, true, year, month + 1);
        calendarDays.appendChild(dayElement);
    }
}

function createDayElement(day, isOtherMonth, year, month) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isOtherMonth) dayElement.classList.add('other-month');
    
    const today = new Date();
    if (!isOtherMonth && day === today.getDate() && 
        month === today.getMonth() && year === today.getFullYear()) {
        dayElement.classList.add('today');
    }
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Get bookings for this date
    const dayBookings = calendarBookings.filter(booking => {
        const checkIn = booking.check_in;
        const checkOut = booking.check_out;
        return dateStr >= checkIn && dateStr <= checkOut;
    });
    
    const checkIns = calendarBookings.filter(b => b.check_in === dateStr);
    const checkOuts = calendarBookings.filter(b => b.check_out === dateStr);
    
    dayElement.innerHTML = `
        <div class="day-number">${day}</div>
        <div class="booking-indicators">
            ${checkIns.map(() => '<span class="booking-dot checkin"></span>').join('')}
            ${checkOuts.map(() => '<span class="booking-dot checkout"></span>').join('')}
        </div>
        ${dayBookings.length > 0 ? `<div class="booking-count">${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}</div>` : ''}
    `;
    
    if (dayBookings.length > 0) {
        dayElement.title = dayBookings.map(b => `${b.guest_name} - ${b.resort_name}`).join('\n');
    }
    
    return dayElement;
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

let dashboardData = {};

async function loadDashboard() {
    try {
        const response = await fetch('/api/analytics/dashboard');
        dashboardData = await response.json();
        updateDashboard();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboard() {
    // Update stats cards
    document.getElementById('totalResorts').textContent = dashboardData.totalResorts || 0;
    document.getElementById('totalBookings').textContent = dashboardData.totalBookings || 0;
    document.getElementById('totalRevenue').textContent = `₹${(dashboardData.totalRevenue || 0).toLocaleString()}`;
    document.getElementById('todayBookings').textContent = dashboardData.todayBookings || 0;
    
    // Update location stats
    updateLocationStats();
    
    // Update recent bookings
    updateRecentBookings();
    
    // Update revenue chart
    updateRevenueChart();
}

function updateLocationStats() {
    const container = document.getElementById('locationStats');
    const locations = dashboardData.locationStats || [];
    
    container.innerHTML = locations.map(location => `
        <div class="location-item">
            <span class="location-name">${location.location}</span>
            <span class="location-count">${location.count}</span>
        </div>
    `).join('');
}

function updateRecentBookings() {
    const container = document.getElementById('recentBookingsList');
    const bookings = dashboardData.recentBookings || [];
    
    container.innerHTML = bookings.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <div class="booking-guest">${booking.guest_name}</div>
                <div class="booking-resort">${booking.resort_name}</div>
            </div>
            <div class="booking-amount">₹${(booking.total_price || 0).toLocaleString()}</div>
        </div>
    `).join('');
}

function updateRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    const ctx = canvas.getContext('2d');
    const monthlyData = dashboardData.monthlyRevenue || [];
    
    // Simple bar chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (monthlyData.length === 0) {
        ctx.fillStyle = '#ccc';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
    const barWidth = canvas.width / monthlyData.length;
    const barMaxHeight = canvas.height - 40;
    
    monthlyData.forEach((data, index) => {
        const barHeight = (data.revenue / maxRevenue) * barMaxHeight;
        const x = index * barWidth;
        const y = canvas.height - barHeight - 20;
        
        // Draw bar
        ctx.fillStyle = '#667eea';
        ctx.fillRect(x + 10, y, barWidth - 20, barHeight);
        
        // Draw month label
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.month, x + barWidth / 2, canvas.height - 5);
        
        // Draw value
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText(`₹${data.revenue.toLocaleString()}`, x + barWidth / 2, y - 5);
    });
}

async function exportData(type, format) {
    try {
        const response = await fetch(`/api/export/${type}?format=${format}`);
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = format === 'excel' ? 'xlsx' : 'csv';
        a.download = `${type}-${timestamp}.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`${type} exported successfully!`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed. Please try again.', 'error');
    }
}

async function getCSRFToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'include'
        });
        const data = await response.json();
        csrfToken = data.token;
        console.log('CSRF token obtained successfully');
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        csrfToken = '';
    }
}

function setupEventListeners() {
    document.getElementById('addResortForm').addEventListener('submit', handleAddResort);
    document.getElementById('editResortForm').addEventListener('submit', handleEditResort);
    document.getElementById('addDiscountForm').addEventListener('submit', handleAddDiscount);
}

async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

let discountCodes = [];

async function loadDiscountCodes() {
    try {
        const response = await fetch('/api/discount-codes');
        discountCodes = await response.json();
        displayDiscountCodes();
    } catch (error) {
        console.error('Error loading discount codes:', error);
    }
}

function displayDiscountCodes() {
    const grid = document.getElementById('discountCodesGrid');
    
    grid.innerHTML = discountCodes.map(code => `
        <div class="resort-card">
            <div class="resort-status">
                <div>
                    <h4>${code.code}</h4>
                    <p>${code.discount_type === 'percentage' ? code.discount_value + '%' : '₹' + code.discount_value} off</p>
                    <small>Used: ${code.used_count}/${code.max_uses || '∞'} | Min: ₹${code.min_amount}</small>
                </div>
                <span class="status-badge ${code.active ? 'available' : 'unavailable'}">
                    ${code.active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="resort-actions">
                <button class="availability-btn ${code.active ? 'available' : 'unavailable'}" 
                        onclick="toggleDiscountStatus(${code.id}, ${!code.active})">
                    <i class="fas fa-${code.active ? 'eye-slash' : 'eye'}"></i> 
                    ${code.active ? 'Disable' : 'Enable'}
                </button>
                <button class="delete-btn" onclick="deleteDiscountCode(${code.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function handleAddDiscount(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    const discountData = {
        code: formData.get('code').toUpperCase(),
        discountType: formData.get('discountType'),
        discountValue: parseInt(formData.get('discountValue')),
        minAmount: parseInt(formData.get('minAmount')) || 0,
        maxUses: parseInt(formData.get('maxUses')) || null,
        validUntil: formData.get('validUntil') || null
    };
    
    try {
        const response = await fetch('/api/discount-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(discountData)
        });
        
        if (response.ok) {
            showNotification('Discount code added successfully!', 'success');
            e.target.reset();
            loadDiscountCodes();
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showNotification('Error adding discount code: ' + error.message, 'error');
    }
}

function sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 12px 20px; border-radius: 4px; color: white;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showConfirmation(message) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
        modal.innerHTML = `<div style="background:white;padding:20px;border-radius:8px;text-align:center"><p>${message}</p><button onclick="this.parentElement.parentElement.remove();resolve(true)" style="margin:5px;padding:8px 16px;background:#f44336;color:white;border:none;border-radius:4px">Yes</button><button onclick="this.parentElement.parentElement.remove();resolve(false)" style="margin:5px;padding:8px 16px;background:#ccc;border:none;border-radius:4px">No</button></div>`;
        document.body.appendChild(modal);
        modal.querySelector('button').onclick = () => { modal.remove(); resolve(true); };
        modal.querySelector('button:last-child').onclick = () => { modal.remove(); resolve(false); };
    });
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    
    grid.innerHTML = resorts.map(resort => {
        const safeName = sanitizeHtml(resort.name || '');
        const safeLocation = sanitizeHtml(resort.location || '');
        const safePrice = parseInt(resort.price) || 0;
        const safeMaxGuests = parseInt(resort.max_guests) || 0;
        const safePerHeadCharge = parseInt(resort.per_head_charge) || 0;
        const safeId = parseInt(resort.id) || 0;
        const isAvailable = Boolean(resort.available);
        
        return `
        <div class="resort-card">
            <div class="resort-status">
                <div>
                    <h4>${safeName}</h4>
                    <p>${safeLocation} - ₹${safePrice}/night</p>
                    <small>Max: ${safeMaxGuests} guests, Extra: ₹${safePerHeadCharge}/head</small>
                </div>
                <span class="status-badge ${isAvailable ? 'available' : 'unavailable'}">
                    ${isAvailable ? 'Available' : 'Unavailable'}
                </span>
            </div>
            <div class="resort-media">
                ${resort.images && resort.images.length > 0 ? 
                    `<img src="${sanitizeHtml(resort.images[0])}" alt="${safeName}" style="width:100px;height:60px;object-fit:cover;" onerror="this.style.display='none'">` : 
                    '<div style="width:100px;height:60px;background:#eee;display:flex;align-items:center;justify-content:center;">No Image</div>'
                }
                <small>${resort.images ? resort.images.length : 0} images, ${resort.videos ? resort.videos.length : 0} videos</small>
            </div>
            <div class="resort-actions">
                <button class="availability-btn ${isAvailable ? 'available' : 'unavailable'}" 
                        onclick="toggleAvailability(${safeId}, ${!isAvailable}); return false;">
                    <i class="fas fa-${isAvailable ? 'eye-slash' : 'eye'}"></i> 
                    ${isAvailable ? 'Disable' : 'Enable'}
                </button>
                <button class="edit-btn" onclick="openEditModal(${safeId})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteResort(${safeId})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

async function handleAddResort(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Adding...';
    submitBtn.disabled = true;
    
    try {
        // Get CSRF token first
        const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
        if (!csrfResponse.ok) {
            throw new Error('Failed to get CSRF token');
        }
        const csrfData = await csrfResponse.json();
        
        const formData = new FormData(e.target);
    
    // Parse URLs from textarea
    const imageUrls = formData.get('imageUrls') ? 
        formData.get('imageUrls').split('\n').map(url => url.trim()).filter(url => url) : [];
    const videoUrls = formData.get('videoUrls') ? 
        formData.get('videoUrls').split('\n').map(url => url.trim()).filter(url => url) : [];
    
    const resortData = {
        name: formData.get('name'),
        location: formData.get('location'),
        price: parseInt(formData.get('price')),
        peakPrice: parseInt(formData.get('peakPrice')) || null,
        offPeakPrice: parseInt(formData.get('offPeakPrice')) || null,
        peakStart: formData.get('peakStart') || null,
        peakEnd: formData.get('peakEnd') || null,
        description: formData.get('description'),
        amenities: formData.get('amenities') ? formData.get('amenities').split(',').map(a => a.trim()) : [],
        maxGuests: parseInt(formData.get('maxGuests')) || 10,
        perHeadCharge: parseInt(formData.get('perHeadCharge')) || 300,
        images: imageUrls,
        videos: videoUrls,
        mapLink: formData.get('mapLink') || ''
    };
    
    try {
        const response = await fetch('/api/resorts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfData.token
            },
            credentials: 'include',
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            console.log('Resort added successfully!');
            showNotification('Resort added successfully!', 'success');
            e.target.reset();
            loadResorts();
        } else {
            const error = await response.json();
            console.error('Error adding resort:', error.error || 'Unknown error');
            showNotification('Error adding resort: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        console.error('Error adding resort:', error.message);
        showNotification('Error adding resort: ' + error.message, 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function openEditModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    document.getElementById('editResortId').value = resort.id;
    document.getElementById('editName').value = resort.name;
    document.getElementById('editLocation').value = resort.location;
    document.getElementById('editPrice').value = resort.price;
    document.getElementById('editDescription').value = resort.description;
    document.getElementById('editAmenities').value = resort.amenities ? resort.amenities.join(', ') : '';
    document.getElementById('editMaxGuests').value = resort.max_guests || 10;
    document.getElementById('editPerHeadCharge').value = resort.per_head_charge || 300;
    document.getElementById('editImageUrls').value = resort.images ? resort.images.join('\n') : '';
    document.getElementById('editVideoUrls').value = resort.videos ? resort.videos.join('\n') : '';
    document.getElementById('editMapLink').value = resort.map_link || '';
    document.getElementById('editPeakPrice').value = resort.peak_price || '';
    document.getElementById('editOffPeakPrice').value = resort.off_peak_price || '';
    document.getElementById('editPeakStart').value = resort.peak_season_start || '';
    document.getElementById('editPeakEnd').value = resort.peak_season_end || '';
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditResort(e) {
    e.preventDefault();
    
    const resortId = document.getElementById('editResortId').value;
    
    // Parse URLs from textarea
    const imageUrls = document.getElementById('editImageUrls').value ? 
        document.getElementById('editImageUrls').value.split('\n').map(url => url.trim()).filter(url => url) : [];
    const videoUrls = document.getElementById('editVideoUrls').value ? 
        document.getElementById('editVideoUrls').value.split('\n').map(url => url.trim()).filter(url => url) : [];
    
    const resortData = {
        name: document.getElementById('editName').value,
        location: document.getElementById('editLocation').value,
        price: parseInt(document.getElementById('editPrice').value),
        peakPrice: parseInt(document.getElementById('editPeakPrice').value) || null,
        offPeakPrice: parseInt(document.getElementById('editOffPeakPrice').value) || null,
        peakStart: document.getElementById('editPeakStart').value || null,
        peakEnd: document.getElementById('editPeakEnd').value || null,
        description: document.getElementById('editDescription').value,
        amenities: document.getElementById('editAmenities').value.split(',').map(a => a.trim()).filter(a => a),
        maxGuests: parseInt(document.getElementById('editMaxGuests').value) || 10,
        perHeadCharge: parseInt(document.getElementById('editPerHeadCharge').value) || 300,
        images: imageUrls,
        videos: videoUrls,
        mapLink: document.getElementById('editMapLink').value || ''
    };
    
    try {
        // Get fresh CSRF token
        await getCSRFToken();
        
        const response = await fetch(`/api/resorts/${resortId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            console.log('Resort updated successfully!');
            showNotification('Resort updated successfully!', 'success');
            closeEditModal();
            loadResorts();
        } else {
            const error = await response.json();
            console.error('Error updating resort:', error.error || 'Unknown error');
            showNotification('Error updating resort: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        console.error('Error updating resort:', error.message);
        showNotification('Error updating resort: ' + error.message, 'error');
    }
}

async function toggleAvailability(resortId, newAvailability) {
    console.log(`Toggling resort ${resortId} to ${newAvailability}`);
    
    try {
        const response = await fetch(`/api/resorts/${resortId}/availability`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ available: newAvailability })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            console.log(`Resort ${newAvailability ? 'enabled' : 'disabled'} successfully!`);
            showNotification(`Resort ${newAvailability ? 'enabled' : 'disabled'} successfully!`, 'success');
            
            // Update local data immediately for instant UI update
            const resort = resorts.find(r => r.id === resortId);
            if (resort) {
                console.log('Updating local resort data');
                resort.available = newAvailability;
                displayResorts();
            } else {
                console.log('Resort not found in local data');
            }
            
            // Also reload from server to ensure sync
            setTimeout(() => loadResorts(), 100);
        } else {
            console.error('Error updating availability, status:', response.status);
            showNotification('Error updating availability', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating availability: ' + error.message, 'error');
    }
}

async function deleteResort(resortId) {
    if (!await showConfirmation('Are you sure you want to delete this resort?')) return;
    
    try {
        const response = await fetch(`/api/resorts/${resortId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('Resort deleted successfully!');
            showNotification('Resort deleted successfully!', 'success');
            loadResorts();
        } else {
            console.error('Error deleting resort');
            showNotification('Error deleting resort', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        console.error('Error deleting resort');
        showNotification('Error deleting resort', 'error');
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
}