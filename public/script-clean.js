let resorts = [];
let filteredResorts = [];
let currentPage = 1;
const itemsPerPage = 6;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
});

function setupEventListeners() {
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
}

async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        filteredResorts = resorts;
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    
    if (filteredResorts.length === 0) {
        grid.innerHTML = '<div>No resorts available</div>';
        return;
    }
    
    grid.innerHTML = filteredResorts.map(resort => `
        <div class="resort-card">
            <h3>${resort.name}</h3>
            <p>${resort.location}</p>
            <p>₹${resort.price}/night</p>
            <p>${resort.description}</p>
            <button onclick="openBookingModal(${resort.id})">Book Now</button>
        </div>
    `).join('');
}

function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    document.getElementById('bookingResortId').value = resortId;
    document.getElementById('modalResortName').textContent = resort.name;
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

async function handleBooking(e) {
    e.preventDefault();
    
    const bookingData = {
        resortId: document.getElementById('bookingResortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: '+91' + document.getElementById('phone').value,
        checkIn: document.getElementById('checkIn').value + 'T11:00',
        checkOut: document.getElementById('checkOut').value + 'T09:00',
        guests: document.getElementById('guests').value,
        paymentId: 'CASH_' + Date.now()
    };
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        if (response.ok) {
            const booking = await response.json();
            alert('Booking confirmed! ID: ' + booking.bookingReference);
            closeModal();
        } else {
            const error = await response.json();
            alert('Booking failed: ' + error.error);
        }
    } catch (error) {
        alert('Booking failed: ' + error.message);
    }
}

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').value = today;
    document.getElementById('checkIn').min = today;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    document.getElementById('checkOut').value = tomorrowStr;
    document.getElementById('checkOut').min = tomorrowStr;
}