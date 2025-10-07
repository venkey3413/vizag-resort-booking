let bookings = [];

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    loadFoodOrders();
    setupEventBridgeSync();
});

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

async function loadFoodOrders() {
    try {
        const response = await fetch('/api/food-orders');
        const orders = await response.json();
        window.currentFoodOrders = orders;
        displayFoodOrders(orders);
    } catch (error) {
        console.error('Error loading food orders:', error);
        document.getElementById('foodOrdersGrid').innerHTML = '<p>Error loading food orders</p>';
    }
}

function displayFoodOrders(orders) {
    const grid = document.getElementById('foodOrdersGrid');
    
    if (orders.length === 0) {
        grid.innerHTML = '<div class="empty-state">No food orders found</div>';
        return;
    }
    
    grid.innerHTML = orders.map(order => `
        <div class="food-order-card">
            <div class="food-order-header">
                <div class="food-order-id">🍽️ ${order.orderId}</div>
                <div class="food-order-status ${order.status}">${order.status.replace('_', ' ').toUpperCase()}</div>
            </div>
            
            <div class="food-order-details">
                <div>
                    <p><strong>Booking ID:</strong> ${order.bookingId}</p>
                    <p><strong>Guest Name:</strong> ${order.guestName}</p>
                    <p><strong>Resort:</strong> ${order.resortName}</p>
                    <p><strong>Phone:</strong> ${order.phoneNumber}</p>
                    <p><strong>Order Time:</strong> ${new Date(order.orderTime).toLocaleString()}</p>
                    <p><strong>Delivery Time:</strong> ${new Date(order.deliveryTime).toLocaleString()}</p>
                </div>
                <div>
                    <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
                    <p><strong>Delivery Fee:</strong> ₹${order.deliveryFee}</p>
                    <p><strong>Total:</strong> ₹${order.total}</p>
                </div>
            </div>
            
            <div class="food-order-items">
                <h4>Items:</h4>
                ${order.items.map(item => `
                    <div class="food-item">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>₹${item.price * item.quantity}</span>
                    </div>
                `).join('')}
            </div>
            
            ${order.paymentMethod ? `
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                ${order.transactionId ? `<p><strong>Transaction ID:</strong> ${order.transactionId}</p>` : ''}
                ${order.paymentId ? `<p><strong>Payment ID:</strong> ${order.paymentId}</p>` : ''}
            ` : ''}
            
            <div class="food-order-actions">
                ${order.status === 'pending_verification' ? `
                    <button class="confirm-food-btn" onclick="confirmFoodOrder('${order.orderId}')">
                        ✅ Confirm Payment & Send Invoice
                    </button>
                    <button class="cancel-food-btn" onclick="cancelFoodOrder('${order.orderId}')">
                        ❌ Cancel Order
                    </button>
                ` : ''}
                ${order.status === 'pending_payment' ? `
                    <button class="cancel-food-btn" onclick="cancelFoodOrder('${order.orderId}')">
                        ❌ Cancel Order
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function confirmFoodOrder(orderId) {
    if (!confirm('Confirm this food order payment and send invoice?')) return;
    
    try {
        const response = await fetch(`/api/food-orders/${orderId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            alert('Food order confirmed and invoice sent!');
            loadFoodOrders();
        } else {
            alert('Failed to confirm food order');
        }
    } catch (error) {
        console.error('Error confirming food order:', error);
        alert('Error confirming food order');
    }
}

async function cancelFoodOrder(orderId) {
    if (!confirm('Cancel this food order?')) return;
    
    try {
        const response = await fetch(`/api/food-orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            alert('Food order cancelled successfully!');
            loadFoodOrders();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to cancel food order');
        }
    } catch (error) {
        console.error('Error cancelling food order:', error);
        alert('Error cancelling food order');
    }
}

function setupEventBridgeSync() {
    console.log('📡 EventBridge enabled (AWS Lambda triggers)');
    // EventBridge events will trigger Lambda functions that update the UI
    // No client-side SSE needed - all updates happen server-side
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
function showCouponModal() {
    loadCoupons();
    document.getElementById('couponModal').style.display = 'block';
}

function closeCouponModal() {
    document.getElementById('couponModal').style.display = 'none';
}

async function loadCoupons() {
    try {
        const response = await fetch('/api/coupons');
        const coupons = await response.json();
        const list = document.getElementById('couponList');
        list.innerHTML = coupons.map(coupon => {
            const dayTypeText = coupon.day_type === 'weekday' ? 'Weekdays' : 
                               coupon.day_type === 'weekend' ? 'Weekends' : 'All Days';
            return `
                <div class="coupon-item">
                    <span><strong>${coupon.code}</strong> - ${coupon.type === 'percentage' ? coupon.discount + '%' : '₹' + coupon.discount} (${dayTypeText})</span>
                    <button onclick="deleteCoupon('${coupon.code}')">Delete</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

async function createCoupon() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const type = document.getElementById('couponType').value;
    const discount = parseInt(document.getElementById('couponDiscount').value);
    const day_type = document.getElementById('couponDayType').value;
    
    if (!code || !discount) {
        alert('Please fill all fields');
        return;
    }
    
    try {
        const response = await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, type, discount, day_type })
        });
        
        if (response.ok) {
            alert('Coupon created successfully');
            document.getElementById('couponCode').value = '';
            document.getElementById('couponDiscount').value = '';
            document.getElementById('couponDayType').value = 'all';
            loadCoupons();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create coupon');
        }
    } catch (error) {
        alert('Network error');
    }
}

async function deleteCoupon(code) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    
    try {
        const response = await fetch(`/api/coupons/${code}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Coupon deleted');
            loadCoupons();
        }
    } catch (error) {
        alert('Failed to delete coupon');
    }
}

// Resort blocking functions
function showBlockModal() {
    loadResorts();
    loadBlocks();
    document.getElementById('blockModal').style.display = 'block';
}

function closeBlockModal() {
    document.getElementById('blockModal').style.display = 'none';
}

async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        const resorts = await response.json();
        const select = document.getElementById('blockResortId');
        select.innerHTML = '<option value="">Select Resort</option>' + 
            resorts.map(resort => `<option value="${resort.id}">${resort.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

async function loadBlocks() {
    try {
        const response = await fetch('/api/resort-blocks');
        const blocks = await response.json();
        const list = document.getElementById('blockList');
        list.innerHTML = blocks.map(block => `
            <div class="block-item">
                <span><strong>${block.resort_name}</strong> - ${new Date(block.block_date).toLocaleDateString()} - ${block.reason || 'No reason'}</span>
                <button onclick="removeBlock(${block.id})">Remove</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading blocks:', error);
    }
}

async function blockResort() {
    const resort_id = document.getElementById('blockResortId').value;
    const block_date = document.getElementById('blockDate').value;
    const reason = document.getElementById('blockReason').value;
    
    if (!resort_id || !block_date) {
        alert('Please select resort and date');
        return;
    }
    
    try {
        const response = await fetch('/api/resort-blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resort_id, block_date, reason })
        });
        
        if (response.ok) {
            alert('Resort date blocked successfully');
            document.getElementById('blockDate').value = '';
            document.getElementById('blockReason').value = '';
            loadBlocks();
        } else {
            alert('Failed to block resort date');
        }
    } catch (error) {
        alert('Network error');
    }
}

async function removeBlock(id) {
    if (!confirm('Remove this block?')) return;
    
    try {
        const response = await fetch(`/api/resort-blocks/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Block removed');
            loadBlocks();
        }
    } catch (error) {
        alert('Failed to remove block');
    }
}