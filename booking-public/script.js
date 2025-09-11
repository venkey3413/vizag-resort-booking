let bookings = [];
let socket;

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    initializeSocket();
});

function initializeSocket() {
    socket = io();
    
    socket.on('bookingCreated', (booking) => {
        console.log('New booking received:', booking.id);
        bookings.unshift(booking);
        displayBookings();
        updateStats();
    });
    
    socket.on('booking-created', (booking) => {
        console.log('New booking received (alt):', booking.id);
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
                        <p><strong>Check-in:</strong> ${checkIn.toLocaleDateString()} at ${checkIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <p><strong>Check-out:</strong> ${checkOut.toLocaleDateString()} at ${checkOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <p><strong>Nights:</strong> ${nights}</p>
                        <p><strong>Guests:</strong> ${booking.guests}</p>
                        ${booking.utr_number ? `<p><strong>UTR Number:</strong> ${booking.utr_number}</p>` : ''}
                        ${booking.payment_id ? `<p><strong>Payment ID:</strong> ${booking.payment_id}</p>` : ''}
                        <p><strong>Payment Status:</strong> <span class="payment-status-${booking.payment_status || 'pending'}">${(booking.payment_status || 'pending').toUpperCase()}</span></p>
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
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('Booking deleted successfully!');
            loadBookings();
        } else {
            console.error('Error deleting booking');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function printInvoice(bookingId) {
    // Find the invoice card containing this booking ID
    const invoiceCards = document.querySelectorAll('.invoice-card');
    let targetCard = null;
    
    invoiceCards.forEach(card => {
        const cardBookingId = card.querySelector('.booking-id');
        if (cardBookingId && cardBookingId.textContent === bookingId) {
            targetCard = card;
        }
    });
    
    if (targetCard) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice ${bookingId}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        .invoice-card { border: 2px solid #333; padding: 20px; max-width: 800px; }
                        .invoice-header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; }
                        .invoice-title h3 { margin: 0; font-size: 1.5em; }
                        .booking-id { background: #333; color: white; padding: 8px 15px; border-radius: 5px; font-weight: bold; }
                        .invoice-body { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px; }
                        .guest-info h4, .booking-details h4 { border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 15px; }
                        .guest-info p, .booking-details p { margin: 8px 0; }
                        .invoice-footer { border-top: 2px solid #333; padding-top: 15px; text-align: center; }
                        .total-amount h3 { font-size: 1.5em; color: #27ae60; margin: 0; }
                        .invoice-actions { display: none; }
                        @media print { .invoice-actions { display: none !important; } }
                    </style>
                </head>
                <body>
                    ${targetCard.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    } else {
        console.error('Invoice not found for printing');
    }
}