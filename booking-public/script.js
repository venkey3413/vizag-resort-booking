let bookings = [];

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    setupWebSocketSync();
});

function setupWebSocketSync() {
    console.log('🔄 Booking EventBridge sync enabled');
    
    setInterval(async () => {
        try {
            const response = await fetch('./api/bookings');
            const newBookings = await response.json();
            
            if (JSON.stringify(newBookings) !== JSON.stringify(bookings)) {
                console.log('🔄 EventBridge update detected');
                bookings = newBookings;
                displayBookings();
            }
        } catch (error) {}
    }, 3000);
}

async function loadBookings() {
    try {
        const response = await fetch('./api/bookings');
        bookings = await response.json();
        displayBookings();
    } catch (error) {
        console.error('Error loading bookings:', error);
        showNotification('Failed to load bookings', 'error');
    }
}

function displayBookings() {
    const grid = document.getElementById('bookingsGrid');
    
    if (bookings.length === 0) {
        grid.innerHTML = '<div class="empty-state">No bookings found</div>';
        return;
    }

    grid.innerHTML = bookings.map(booking => `
        <div class="booking-card">
            <div class="booking-info">
                <h4>${booking.resort_name}</h4>
                <div class="booking-details">
                    <p><strong>Guest:</strong> ${booking.guest_name}</p>
                    <p><strong>Email:</strong> ${booking.email}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Dates:</strong> ${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</p>
                    <p><strong>Guests:</strong> ${booking.guests}</p>
                    <p><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</p>
                    <p><strong>Total:</strong> ₹${booking.total_price.toLocaleString()}</p>
                    <p><strong>Payment:</strong> <span class="payment-${booking.payment_status || 'pending'}">${(booking.payment_status || 'pending').toUpperCase()}</span></p>
                    ${booking.transaction_id ? `<p><strong>Transaction ID:</strong> ${booking.transaction_id}</p>` : ''}
                    <p><strong>Booked:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="booking-actions">
                <div class="booking-status status-${booking.status}">
                    ${booking.status.toUpperCase()}
                </div>
                ${(booking.payment_status || 'pending') === 'pending' ? 
                    `<button class="paid-btn" onclick="markAsPaid(${booking.id})">Mark as Paid</button>` : 
                    `<button class="invoice-btn" onclick="generateInvoice(${booking.id})">Download Invoice</button>`}
                <button class="delete-btn" onclick="deleteBooking(${booking.id})">
                    Cancel Booking
                </button>
            </div>
        </div>
    `).join('');
}

async function markAsPaid(id) {
    if (!confirm('Mark this booking as paid?')) return;

    try {
        const response = await fetch(`./api/bookings/${id}/payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ payment_status: 'paid' })
        });

        if (response.ok) {
            showNotification('Booking marked as paid', 'success');
            loadBookings();
        } else {
            showNotification('Failed to update payment status', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function deleteBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        const response = await fetch(`./api/bookings/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Booking cancelled successfully', 'success');
            loadBookings();
        } else {
            showNotification('Failed to cancel booking', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function generateInvoice(id) {
    try {
        const booking = bookings.find(b => b.id === id);
        if (!booking) return;
        
        // Create invoice content
        const invoiceContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="text-align: center; color: #333;">INVOICE</h2>
                <hr>
                <div style="margin: 20px 0;">
                    <h3>Vizag Resorts</h3>
                    <p>Email: info@vizagresorts.com</p>
                    <p>Phone: +91 9876543210</p>
                </div>
                <hr>
                <div style="margin: 20px 0;">
                    <p><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</p>
                    <p><strong>Guest Name:</strong> ${booking.guest_name}</p>
                    <p><strong>Email:</strong> ${booking.email}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Resort:</strong> ${booking.resort_name}</p>
                    <p><strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleDateString()}</p>
                    <p><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString()}</p>
                    <p><strong>Guests:</strong> ${booking.guests}</p>
                    <p><strong>Total Amount:</strong> ₹${booking.total_price.toLocaleString()}</p>
                    <p><strong>Payment Status:</strong> ${(booking.payment_status || 'pending').toUpperCase()}</p>
                    <p><strong>Booking Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                </div>
                <hr>
                <p style="text-align: center; margin-top: 20px;">Thank you for choosing Vizag Resorts!</p>
            </div>
        `;
        
        // Create and download invoice
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceContent);
        printWindow.document.close();
        printWindow.print();
        
        showNotification('Invoice generated successfully', 'success');
    } catch (error) {
        console.error('Invoice generation error:', error);
        showNotification('Failed to generate invoice', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}