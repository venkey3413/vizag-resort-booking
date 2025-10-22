let bookings = [];

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    loadFoodOrders();
    loadTravelBookings();
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
                <button class="whatsapp-btn" onclick="sendWhatsAppMessage('food', '${order.orderId}', '${order.status}')">
                    📱 WhatsApp
                </button>
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

async function clearAllFoodOrders() {
    if (!confirm('Are you sure you want to clear ALL food orders? This action cannot be undone.')) return;
    
    const button = document.getElementById('clearAllFoodOrdersBtn');
    const originalText = button.textContent;
    button.textContent = '🔄 Clearing...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/food-orders/clear-all', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`Successfully cleared ${result.deletedCount} food orders`);
            loadFoodOrders();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to clear food orders');
        }
    } catch (error) {
        console.error('Error clearing food orders:', error);
        alert('Error clearing food orders');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

function setupEventBridgeSync() {
    console.log('📡 EventBridge real-time sync enabled');
    
    try {
        const eventSource = new EventSource('/api/events');
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📡 EventBridge event received:', data);
                
                if (data.type === 'booking.created' || data.type === 'booking.updated' || data.type === 'payment.updated') {
                    console.log('📋 Booking update detected - refreshing bookings!');
                    loadBookings();
                }
                
                if (data.type === 'food.order.created' || data.type === 'food.order.updated') {
                    console.log('🍽️ Food order update detected - refreshing food orders!');
                    loadFoodOrders();
                }
                
                if (data.type === 'travel.booking.created' || data.type === 'travel.booking.updated') {
                    console.log('🚗 Travel booking update detected - refreshing travel bookings!');
                    loadTravelBookings();
                }
            } catch (error) {
                console.log('📡 EventBridge ping or invalid data');
            }
        };
        
        eventSource.onerror = function(error) {
            console.log('⚠️ EventBridge connection error');
        };
        
        eventSource.onopen = function() {
            console.log('✅ EventBridge connected to booking management');
        };
    } catch (error) {
        console.error('EventBridge setup failed:', error);
    }
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
                <button class="whatsapp-btn" onclick="sendWhatsAppMessage('resort', ${booking.id}, '${booking.status}')">
                    📱 WhatsApp
                </button>
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
            <span class="close" onclick="closeCancelModal()">&times;</span>
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
        if (select) {
            select.innerHTML = '<option value="">Select Resort</option>' + 
                resorts.map(resort => `<option value="${resort.id}">${resort.name}</option>`).join('');
        }
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

// Travel booking management functions
async function loadTravelBookings() {
    try {
        const response = await fetch('/api/travel-bookings');
        const bookings = await response.json();
        
        // Ensure bookings is an array
        const bookingsArray = Array.isArray(bookings) ? bookings : [];
        
        window.currentTravelBookings = bookingsArray;
        displayTravelBookings(bookingsArray);
    } catch (error) {
        console.error('Error loading travel bookings:', error);
        document.getElementById('travelBookingsGrid').innerHTML = '<p>Error loading travel bookings</p>';
    }
}

function displayTravelBookings(bookings) {
    const grid = document.getElementById('travelBookingsGrid');
    
    if (bookings.length === 0) {
        grid.innerHTML = '<div class="empty-state">No travel bookings found</div>';
        return;
    }
    
    grid.innerHTML = bookings.map(booking => `
        <div class="travel-booking-card">
            <div class="travel-booking-header">
                <div class="travel-booking-id">🚗 ${booking.booking_reference}</div>
                <div class="travel-booking-status ${booking.status}">${booking.status.replace('_', ' ').toUpperCase()}</div>
            </div>
            
            <div class="travel-booking-details">
                <div>
                    <p><strong>Customer:</strong> ${booking.customer_name}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Email:</strong> ${booking.email}</p>
                    <p><strong>Travel Date:</strong> ${new Date(booking.travel_date).toLocaleDateString()}</p>
                    <p><strong>Pickup Location:</strong> ${booking.pickup_location}</p>
                    <p><strong>Booked:</strong> ${new Date(booking.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <p><strong>Total Amount:</strong> ₹${booking.total_amount.toLocaleString()}</p>
                    ${booking.payment_method ? `<p><strong>Payment Method:</strong> ${booking.payment_method.toUpperCase()}</p>` : ''}
                    ${booking.transaction_id ? `<p><strong>Transaction ID:</strong> ${booking.transaction_id}</p>` : ''}
                </div>
            </div>
            
            <div class="travel-packages">
                <h4>Packages:</h4>
                ${booking.packages.map(pkg => `
                    <div class="travel-package-item">
                        <span>${pkg.name} x ${pkg.quantity}</span>
                        <span>₹${(pkg.price * pkg.quantity).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="travel-booking-actions">
                ${booking.status === 'pending_verification' ? `
                    <button class="confirm-travel-btn" onclick="confirmTravelBooking(${booking.id})">
                        ✅ Confirm Payment & Send Confirmation
                    </button>
                ` : ''}
                ${booking.status !== 'cancelled' ? `
                    <button class="cancel-travel-btn" onclick="cancelTravelBooking(${booking.id})">
                        ❌ Cancel Booking
                    </button>
                ` : ''}
                <button class="remove-travel-btn" onclick="removeTravelBooking(${booking.id})">
                    🗑️ Remove
                </button>
                <button class="whatsapp-btn" onclick="sendWhatsAppMessage('travel', ${booking.id}, '${booking.status}')">
                    📱 WhatsApp
                </button>
            </div>
        </div>
    `).join('');
}

async function confirmTravelBooking(id) {
    if (!confirm('Confirm this travel booking payment and send confirmation email?')) return;
    
    try {
        const response = await fetch(`/api/travel-bookings/${id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            alert('Travel booking confirmed and confirmation email sent!');
            loadTravelBookings();
        } else {
            alert('Failed to confirm travel booking');
        }
    } catch (error) {
        console.error('Error confirming travel booking:', error);
        alert('Error confirming travel booking');
    }
}

async function cancelTravelBooking(id) {
    if (!confirm('Cancel this travel booking?')) return;
    
    try {
        const response = await fetch(`/api/travel-bookings/${id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            alert('Travel booking cancelled successfully!');
            loadTravelBookings();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to cancel travel booking');
        }
    } catch (error) {
        console.error('Error cancelling travel booking:', error);
        alert('Error cancelling travel booking');
    }
}

async function removeTravelBooking(id) {
    if (!confirm('Permanently remove this travel booking from the system?')) return;
    
    try {
        const response = await fetch(`/api/travel-bookings/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Travel booking removed successfully!');
            loadTravelBookings();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to remove travel booking');
        }
    } catch (error) {
        console.error('Error removing travel booking:', error);
        alert('Error removing travel booking');
    }
}



function displayResorts(resorts) {
    const grid = document.getElementById('resortsGrid');
    
    if (resorts.length === 0) {
        grid.innerHTML = '<div class="empty-state">No resorts found</div>';
        return;
    }
    
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <div class="resort-header">
                <h4>${resort.name}</h4>
                <div class="resort-status ${resort.available ? 'available' : 'unavailable'}">
                    ${resort.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                </div>
            </div>
            
            <div class="resort-details">
                <p><strong>Location:</strong> ${resort.location}</p>
                <p><strong>Base Price:</strong> ₹${resort.price.toLocaleString()}</p>
                <p><strong>Description:</strong> ${resort.description || 'No description'}</p>
                ${resort.amenities ? `<p><strong>Amenities:</strong> ${resort.amenities}</p>` : ''}
            </div>
            
            <div class="resort-actions">
                <button class="edit-resort-btn" onclick="editResort(${resort.id})">
                    ✏️ Edit Resort
                </button>
                <button class="toggle-availability-btn" onclick="toggleResortAvailability(${resort.id}, ${resort.available})">
                    ${resort.available ? '❌ Disable' : '✅ Enable'}
                </button>
                <button class="delete-resort-btn" onclick="deleteResort(${resort.id})">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

function showAddResortModal() {
    document.getElementById('resortModalTitle').textContent = 'Add New Resort';
    document.getElementById('resortForm').reset();
    document.getElementById('resortId').value = '';
    document.getElementById('createCouponToggle').checked = false;
    document.getElementById('couponFormSection').style.display = 'none';
    document.getElementById('resortModal').style.display = 'block';
}

function closeResortModal() {
    document.getElementById('resortModal').style.display = 'none';
}

function toggleCouponForm() {
    const toggle = document.getElementById('createCouponToggle');
    const section = document.getElementById('couponFormSection');
    section.style.display = toggle.checked ? 'block' : 'none';
}

async function editResort(id) {
    try {
        const response = await fetch('/api/resorts');
        const resorts = await response.json();
        const resort = resorts.find(r => r.id === id);
        
        if (!resort) {
            alert('Resort not found');
            return;
        }
        
        document.getElementById('resortModalTitle').textContent = 'Edit Resort';
        document.getElementById('resortId').value = resort.id;
        document.getElementById('resortName').value = resort.name;
        document.getElementById('resortLocation').value = resort.location;
        document.getElementById('resortPrice').value = resort.price;
        document.getElementById('resortDescription').value = resort.description || '';
        document.getElementById('resortImage').value = resort.image || '';
        document.getElementById('resortGallery').value = resort.gallery || '';
        document.getElementById('resortVideos').value = resort.videos || '';
        document.getElementById('resortMapLink').value = resort.map_link || '';
        document.getElementById('resortAmenities').value = resort.amenities || '';
        
        document.getElementById('createCouponToggle').checked = false;
        document.getElementById('couponFormSection').style.display = 'none';
        document.getElementById('resortModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading resort:', error);
        alert('Error loading resort details');
    }
}

// Resort form submission (if form exists)
const resortForm = document.getElementById('resortForm');
if (resortForm) {
    resortForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const resortId = document.getElementById('resortId').value;
    const isEdit = !!resortId;
    
    const resortData = {
        name: document.getElementById('resortName').value,
        location: document.getElementById('resortLocation').value,
        price: parseInt(document.getElementById('resortPrice').value),
        description: document.getElementById('resortDescription').value,
        image: document.getElementById('resortImage').value,
        gallery: document.getElementById('resortGallery').value,
        videos: document.getElementById('resortVideos').value,
        map_link: document.getElementById('resortMapLink').value,
        amenities: document.getElementById('resortAmenities').value
    };
    
    try {
        const url = isEdit ? `/api/resorts/${resortId}` : '/api/resorts';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            // Create coupon if requested
            const createCoupon = document.getElementById('createCouponToggle').checked;
            if (createCoupon) {
                const couponCode = document.getElementById('newCouponCode').value.trim().toUpperCase();
                const couponType = document.getElementById('newCouponType').value;
                const couponDiscount = parseInt(document.getElementById('newCouponDiscount').value);
                const couponDayType = document.getElementById('newCouponDayType').value;
                
                if (couponCode && couponDiscount) {
                    try {
                        const couponResponse = await fetch('/api/coupons', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: couponCode,
                                type: couponType,
                                discount: couponDiscount,
                                day_type: couponDayType
                            })
                        });
                        
                        if (couponResponse.ok) {
                            alert(`Resort ${isEdit ? 'updated' : 'created'} successfully with coupon ${couponCode}!`);
                        } else {
                            const couponError = await couponResponse.json();
                            alert(`Resort ${isEdit ? 'updated' : 'created'} successfully, but coupon creation failed: ${couponError.error}`);
                        }
                    } catch (couponError) {
                        alert(`Resort ${isEdit ? 'updated' : 'created'} successfully, but coupon creation failed`);
                    }
                } else {
                    alert(`Resort ${isEdit ? 'updated' : 'created'} successfully!`);
                }
            } else {
                alert(`Resort ${isEdit ? 'updated' : 'created'} successfully!`);
            }
            
            closeResortModal();
            loadResorts();
        } else {
            const error = await response.json();
            alert(error.error || `Failed to ${isEdit ? 'update' : 'create'} resort`);
        }
    } catch (error) {
        console.error('Error saving resort:', error);
        alert('Network error. Please try again.');
    }
    });
}

async function toggleResortAvailability(id, currentStatus) {
    const newStatus = !currentStatus;
    const action = newStatus ? 'enable' : 'disable';
    
    if (!confirm(`Are you sure you want to ${action} this resort?`)) return;
    
    try {
        const response = await fetch(`/api/resorts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: newStatus })
        });
        
        if (response.ok) {
            alert(`Resort ${action}d successfully`);
            loadResorts();
        } else {
            alert(`Failed to ${action} resort`);
        }
    } catch (error) {
        console.error('Error toggling resort availability:', error);
        alert('Network error. Please try again.');
    }
}

async function deleteResort(id) {
    if (!confirm('Are you sure you want to delete this resort? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/resorts/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Resort deleted successfully');
            loadResorts();
        } else {
            alert('Failed to delete resort');
        }
    } catch (error) {
        console.error('Error deleting resort:', error);
        alert('Network error. Please try again.');
    }
}

function sendWhatsAppMessage(serviceType, id, status) {
    let data, phone, message;
    
    try {
        if (serviceType === 'resort') {
            data = bookings.find(b => b.id == id);
            if (!data) {
                console.error('Booking not found for ID:', id, 'Available bookings:', bookings);
                alert('Booking not found');
                return;
            }
            
            phone = data.phone.replace('+91', '').replace(/\D/g, '');
            const bookingRef = data.booking_reference || `RB${String(data.id).padStart(6, '0')}`;
            
            if (status === 'cancelled') {
                message = `🏨 BOOKING CANCELLED - Vizag Resort

📋 Booking ID: ${bookingRef}
👤 Guest: ${data.guest_name}
🏖️ Resort: ${data.resort_name}
📅 Dates: ${new Date(data.check_in).toLocaleDateString()} - ${new Date(data.check_out).toLocaleDateString()}
💰 Amount: ₹${data.total_price.toLocaleString()}

❌ Your booking has been cancelled. If you have any questions, please contact us.

Vizag Resort Booking`;
            } else if (data.payment_status === 'paid') {
                message = `🏨 BOOKING CONFIRMED - Vizag Resort

📋 Booking ID: ${bookingRef}
👤 Guest: ${data.guest_name}
🏖️ Resort: ${data.resort_name}
📅 Check-in: ${new Date(data.check_in).toLocaleDateString()}
📅 Check-out: ${new Date(data.check_out).toLocaleDateString()}
👥 Guests: ${data.guests}
💰 Amount: ₹${data.total_price.toLocaleString()}

✅ Payment Verified
📧 Invoice sent to email

Thank you for choosing Vizag Resort Booking!`;
            } else {
                message = `🏨 BOOKING PENDING - Vizag Resort

📋 Booking ID: ${bookingRef}
👤 Guest: ${data.guest_name}
🏖️ Resort: ${data.resort_name}
📅 Dates: ${new Date(data.check_in).toLocaleDateString()} - ${new Date(data.check_out).toLocaleDateString()}
💰 Amount: ₹${data.total_price.toLocaleString()}

⏳ Payment verification pending. Please complete payment to confirm your booking.

Vizag Resort Booking`;
            }
        } else if (serviceType === 'food') {
            data = window.currentFoodOrders.find(o => o.orderId === id);
            if (!data) {
                alert('Food order not found');
                return;
            }
            
            phone = data.phoneNumber.replace('+91', '').replace(/\D/g, '');
            
            if (status === 'cancelled') {
                message = `🍽️ FOOD ORDER CANCELLED

📋 Order ID: ${data.orderId}
🏨 Resort: ${data.resortName}
👤 Guest: ${data.guestName}
💰 Amount: ₹${data.total.toLocaleString()}

❌ Your food order has been cancelled. If you have any questions, please contact us.

Vizag Resort Booking`;
            } else if (status === 'confirmed') {
                message = `🍽️ FOOD ORDER CONFIRMED

📋 Order ID: ${data.orderId}
🏨 Resort: ${data.resortName}
👤 Guest: ${data.guestName}
🕰️ Delivery: ${new Date(data.deliveryTime).toLocaleString()}
💰 Amount: ₹${data.total.toLocaleString()}

✅ Order confirmed! Food will be delivered at scheduled time.
📧 Invoice sent to email

Thank you!
Vizag Resort Booking`;
            } else {
                message = `🍽️ FOOD ORDER PENDING

📋 Order ID: ${data.orderId}
🏨 Resort: ${data.resortName}
👤 Guest: ${data.guestName}
💰 Amount: ₹${data.total.toLocaleString()}

⏳ Payment verification pending. Please complete payment to confirm your order.

Vizag Resort Booking`;
            }
        } else if (serviceType === 'travel') {
            data = window.currentTravelBookings.find(b => b.id == id);
            if (!data) {
                alert('Travel booking not found');
                return;
            }
            
            phone = data.phone.replace('+91', '').replace(/\D/g, '');
            const packageNames = data.packages.map(p => `${p.name} x${p.quantity}`).join(', ');
            
            if (status === 'cancelled') {
                message = `🚗 TRAVEL BOOKING CANCELLED

📋 Booking ID: ${data.booking_reference}
👤 Customer: ${data.customer_name}
📅 Travel Date: ${new Date(data.travel_date).toLocaleDateString()}
📍 Pickup: ${data.pickup_location}
🎯 Packages: ${packageNames}
💰 Amount: ₹${data.total_amount.toLocaleString()}

❌ Your travel booking has been cancelled. If you have any questions, please contact us.

Vizag Resort Booking`;
            } else if (status === 'confirmed') {
                message = `🚗 TRAVEL BOOKING CONFIRMED

📋 Booking ID: ${data.booking_reference}
👤 Customer: ${data.customer_name}
📅 Travel Date: ${new Date(data.travel_date).toLocaleDateString()}
📍 Pickup: ${data.pickup_location}
🎯 Packages: ${packageNames}
💰 Amount: ₹${data.total_amount.toLocaleString()}

✅ Booking confirmed! We will contact you before travel date.
📧 Confirmation sent to email

Thank you!
Vizag Resort Booking`;
            } else {
                message = `🚗 TRAVEL BOOKING PENDING

📋 Booking ID: ${data.booking_reference}
👤 Customer: ${data.customer_name}
📅 Travel Date: ${new Date(data.travel_date).toLocaleDateString()}
💰 Amount: ₹${data.total_amount.toLocaleString()}

⏳ Payment verification pending. Please complete payment to confirm your booking.

Vizag Resort Booking`;
            }
        }
        
        // Try WhatsApp desktop app first, then web as fallback
        const whatsappDesktopUrl = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;
        const whatsappWebUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
        
        // Copy to clipboard as backup
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message).catch(() => {});
        }
        
        // Try desktop app first
        const desktopLink = document.createElement('a');
        desktopLink.href = whatsappDesktopUrl;
        desktopLink.click();
        
        // Fallback to web after 2 seconds if desktop doesn't open
        setTimeout(() => {
            window.open(whatsappWebUrl, '_blank');
        }, 2000);
        
    } catch (error) {
        console.error('Error creating WhatsApp message:', error);
        alert('Error creating WhatsApp message');
    }
}