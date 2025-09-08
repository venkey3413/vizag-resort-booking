let bookings = [];
let socket;

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    initializeSocket();
});

function initializeSocket() {
    socket = io();
    
    socket.on('booking-created', (booking) => {
        console.log('New booking received:', booking);
        bookings.unshift(booking);
        displayBookings();
        updateStats();
    });
    
    socket.on('booking-deleted', (data) => {
        bookings = bookings.filter(b => b.id !== data.id);
        displayBookings();
        updateStats();
    });
    
    console.log('Connected to API Gateway events');
}

async function loadBookings() {
    try {
        const response = await fetch('/api/bookings');
        const newBookings = await response.json();
        
        // Only update if data changed
        if (JSON.stringify(newBookings) !== JSON.stringify(bookings)) {
            bookings = newBookings;
            displayBookings();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function displayBookings() {
    const container = document.getElementById('bookingsTable');
    
    if (bookings.length === 0) {
        container.innerHTML = '<p class="no-bookings">No bookings found.</p>';
        return;
    }
    
    container.innerHTML = bookings.map(booking => {
        const bookingDate = new Date(booking.booking_date || Date.now());
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const bookingId = `RB${String(booking.id).padStart(4, '0')}`;
        
        return `
            <div class="invoice-card">
                <div class="invoice-header">
                    <div class="invoice-title">
                        <h3><i class="fas fa-receipt"></i> BOOKING INVOICE</h3>
                        <span class="booking-id">${bookingId}</span>
                    </div>
                    <div class="invoice-date">
                        <p>Date: ${bookingDate.toLocaleDateString()}</p>
                        <span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="invoice-body">
                    <div class="guest-info">
                        <h4><i class="fas fa-user"></i> Guest Information</h4>
                        <p><strong>Name:</strong> ${booking.guest_name}</p>
                        <p><strong>Email:</strong> ${booking.email}</p>
                        <p><strong>Phone:</strong> ${booking.phone}</p>
                    </div>
                    
                    <div class="booking-details">
                        <h4><i class="fas fa-hotel"></i> Booking Details</h4>
                        <p><strong>Resort:</strong> ${booking.resort_name}</p>
                        <p><strong>Check-in:</strong> ${checkIn.toLocaleDateString()}</p>
                        <p><strong>Check-out:</strong> ${checkOut.toLocaleDateString()}</p>
                        <p><strong>Nights:</strong> ${nights}</p>
                        <p><strong>Guests:</strong> ${booking.guests}</p>
                    </div>
                </div>
                
                <div class="invoice-footer">
                    <div class="total-amount">
                        <h3>Total Amount: ₹${booking.total_price ? booking.total_price.toLocaleString() : '0'}</h3>
                    </div>
                    <div class="invoice-actions">
                        <button class="print-btn" onclick="printInvoice('${bookingId}')">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="delete-btn" onclick="deleteBooking(${booking.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
}

async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
        // Delete directly from booking service (no gateway needed for internal operations)
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Booking deleted successfully!');
            loadBookings();
        } else {
            alert('Error deleting booking');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting booking');
    }
}

function printInvoice(bookingId) {
    const invoiceCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
    if (invoiceCard) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice ${bookingId}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .invoice-card { border: 1px solid #ddd; padding: 20px; }
                        .invoice-header { border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .total-amount { font-size: 1.2em; font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${invoiceCard.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}