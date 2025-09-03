let bookings = [];

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
});

async function loadBookings() {
    try {
        const response = await fetch('/api/bookings');
        bookings = await response.json();
        displayBookings();
        updateStats();
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

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
                    <th>ID</th>
                    <th>Guest Name</th>
                    <th>Resort</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Guests</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>#${booking.id}</td>
                        <td>${booking.guestName}</td>
                        <td>${booking.resortName}</td>
                        <td>${booking.email}</td>
                        <td>${booking.phone}</td>
                        <td>${new Date(booking.checkIn).toLocaleDateString()}</td>
                        <td>${new Date(booking.checkOut).toLocaleDateString()}</td>
                        <td>${booking.guests}</td>
                        <td>₹${booking.totalPrice}</td>
                        <td><span class="status">${booking.status}</span></td>
                        <td>
                            <button class="delete-btn" onclick="deleteBooking(${booking.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateStats() {
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    
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