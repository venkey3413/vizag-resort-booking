let bookings = [];

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    setupEventBridgeSync();
});

function setupEventBridgeSync() {
    console.log('📡 EventBridge + fallback polling enabled');
    
    // Primary: EventBridge via Server-Sent Events
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'booking.created' || data.type === 'booking.updated' || data.type === 'payment.updated') {
            console.log('📡 EventBridge update received');
            loadBookings();
        }
    };
    
    eventSource.onerror = function(error) {
        console.log('⚠️ EventBridge connection error, fallback active');
    };
    
    // Fallback: Polling every 30 seconds as backup
    setInterval(async () => {
        try {
            const response = await fetch('/api/bookings');
            const newBookings = await response.json();
            
            if (JSON.stringify(newBookings) !== JSON.stringify(bookings)) {
                console.log('🔄 Fallback sync detected changes');
                bookings = newBookings;
                displayBookings();
            }
        } catch (error) {
            // Silent fallback
        }
    }, 30000);
}

async function loadBookings() {
    try {
        const response = await fetch('/api/bookings');
        bookings = await response.json();
        displayBookings();
    } catch (error) {
        console.error('Error loading bookings:', error);
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
                    ${booking.transaction_id ? `<p><strong>UTR ID:</strong> ${booking.transaction_id}</p>` : '<p><strong>UTR ID:</strong> Not provided</p>'}
                    <p><strong>Booked:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="booking-actions">
                <div class="booking-status status-${booking.status}">
                    ${booking.status.toUpperCase()}
                </div>
                ${(booking.payment_status || 'pending') === 'pending' ? 
                    `<button class="paid-btn" onclick="markAsPaid(${booking.id})">Mark as Paid</button>` : 
                    `<button class="invoice-btn" onclick="generateInvoice(${booking.id})">Download Invoice</button>
                     <button class="email-btn" onclick="sendEmailManually(${booking.id})">Send Email</button>`}
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
        const response = await fetch(`/api/bookings/${id}/payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ payment_status: 'paid' })
        });

        if (response.ok) {
            alert('Booking marked as paid');
            loadBookings();
        } else {
            alert('Failed to update payment status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

function deleteBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    // Show confirmation dialog
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.innerHTML = `
        <div class="modal-content">
            <h3>⚠️ Cancel Booking</h3>
            <p><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</p>
            <p><strong>Guest:</strong> ${booking.guest_name}</p>
            <p><strong>Resort:</strong> ${booking.resort_name}</p>
            <p>Are you sure you want to cancel this booking?</p>
            
            <div class="modal-actions">
                <button onclick="confirmCancelBooking(${id}, true)" class="btn-danger">Yes, Cancel & Send Email</button>
                <button onclick="confirmCancelBooking(${id}, false)" class="btn-warning">Yes, Cancel Only</button>
                <button onclick="closeCancelModal()" class="btn-secondary">No, Keep Booking</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
}

function closeCancelModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

async function confirmCancelBooking(id, sendEmail) {
    closeCancelModal();
    
    try {
        const response = await fetch(`/api/bookings/${id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sendEmail })
        });

        if (response.ok) {
            const emailMsg = sendEmail ? ' and cancellation email sent' : '';
            alert(`Booking cancelled successfully${emailMsg}`);
            loadBookings();
        } else {
            alert('Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

async function sendEmailManually(id) {
    if (!confirm('Send invoice email to customer?')) return;

    try {
        const response = await fetch(`/api/bookings/${id}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Email sent successfully to customer');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Email sending error:', error);
        alert('Network error. Please try again.');
    }
}

async function generateInvoice(id) {
    try {
        const booking = bookings.find(b => b.id === id);
        if (!booking) return;
        
        // Determine payment method and details
        let paymentMethodInfo = '';
        if (booking.transaction_id) {
            // Check if it's a card payment (Razorpay payment IDs start with 'pay_')
            if (booking.transaction_id.startsWith('pay_')) {
                // Get card last 4 digits from payment_proofs table
                try {
                    const response = await fetch(`/api/payment-proof/${booking.id}`);
                    const proofData = await response.json();
                    if (proofData.card_last_four) {
                        paymentMethodInfo = `
                            <p><strong>Payment Method:</strong> Card Payment</p>
                            <p><strong>Payment ID:</strong> ${booking.transaction_id}</p>
                            <p><strong>Card Number:</strong> ****-****-****-${proofData.card_last_four}</p>
                        `;
                    } else {
                        paymentMethodInfo = `
                            <p><strong>Payment Method:</strong> Card Payment</p>
                            <p><strong>Payment ID:</strong> ${booking.transaction_id}</p>
                        `;
                    }
                } catch (error) {
                    paymentMethodInfo = `
                        <p><strong>Payment Method:</strong> Card Payment</p>
                        <p><strong>Payment ID:</strong> ${booking.transaction_id}</p>
                    `;
                }
            } else {
                // UPI Payment
                paymentMethodInfo = `
                    <p><strong>Payment Method:</strong> UPI Payment</p>
                    <p><strong>UTR ID:</strong> ${booking.transaction_id}</p>
                `;
            }
        } else {
            paymentMethodInfo = '<p><strong>Payment Method:</strong> Not specified</p>';
        }
        
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
                    <p><strong>Base Amount:</strong> ₹${(booking.base_price || booking.total_price).toLocaleString()}</p>
                    ${booking.platform_fee ? `<p><strong>Platform Fee:</strong> ₹${booking.platform_fee.toLocaleString()}</p>` : ''}
                    ${booking.transaction_fee ? `<p><strong>Transaction Fee:</strong> ₹${booking.transaction_fee.toLocaleString()}</p>` : ''}
                    <p><strong>Total Amount:</strong> ₹${(booking.total_price + (booking.transaction_fee || 0)).toLocaleString()}</p>
                    ${paymentMethodInfo}
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
        
        alert('Invoice generated successfully');
    } catch (error) {
        console.error('Invoice generation error:', error);
        alert('Failed to generate invoice');
    }
}