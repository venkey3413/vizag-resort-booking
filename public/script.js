let resorts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
    setupLogoRotation();
    setupWebSocketSync();
    preloadQRCode();
});

function preloadQRCode() {
    const qrImage = new Image();
    qrImage.src = 'qr-code.png.jpeg';
    console.log('QR code preloaded for faster display');
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
        });
    });

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('bookingModal');
        const galleryModal = document.getElementById('galleryModal');
        if (event.target === modal) {
            closeModal();
        }
        if (event.target === galleryModal) {
            closeGallery();
        }
    });

    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);

    // Date change events
    document.getElementById('checkIn').addEventListener('change', calculateTotal);
    document.getElementById('checkOut').addEventListener('change', calculateTotal);
    document.getElementById('guests').addEventListener('change', calculateTotal);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
        showNotification('Failed to load resorts', 'error');
    }
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <div class="resort-gallery">
                <img src="${resort.image}" alt="${resort.name}" class="resort-image main-image">
                ${(resort.gallery || resort.videos) ? `
                    <button class="view-more-btn" onclick="openGallery(${resort.id})">
                        📸 View More
                    </button>
                ` : ''}
            </div>
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location">
                    📍 ${resort.location}
                    ${resort.map_link ? `<br><a href="${resort.map_link}" target="_blank" class="view-map-btn">🗺️ View Map</a>` : ''}
                </p>
                <p class="resort-price">₹${resort.price.toLocaleString()}/night</p>
                <p class="resort-description">${resort.description}</p>
                <button class="book-btn" onclick="openBookingModal(${resort.id})">
                    Book Now
                </button>
                <div class="resort-footer">
                    <div class="review-stars">
                        <div class="rating-container" data-resort-id="${resort.id}">
                            <span class="star" data-rating="1">☆</span>
                            <span class="star" data-rating="2">☆</span>
                            <span class="star" data-rating="3">☆</span>
                            <span class="star" data-rating="4">☆</span>
                            <span class="star" data-rating="5">☆</span>
                        </div>
                        <span class="review-text">Rate this resort</span>
                    </div>
                    <div class="cancellation-policy">
                        <a href="Booking cancellation_policy.pdf" target="_blank" class="policy-text">Cancellation Policy</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}



function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;

    document.getElementById('resortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    
    calculateTotal();
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
}

function calculateTotal() {
    const price = parseInt(document.getElementById('resortPrice').value) || 0;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    let nights = 1;
    if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        nights = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }
    
    const basePrice = price * nights;
    const platformFee = Math.round(basePrice * 0.015); // 1.5% platform fee
    const total = basePrice + platformFee;
    
    document.getElementById('totalAmount').innerHTML = `
        <div>Base Price: ₹${basePrice.toLocaleString()}</div>
        <div>Platform Fee (1.5%): ₹${platformFee.toLocaleString()}</div>
        <div style="font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;">
            Total: ₹${total.toLocaleString()}
        </div>
    `;
}

async function handleBooking(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const bookingData = {
        resortId: document.getElementById('resortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        guests: document.getElementById('guests').value
    };
    
    // Date validation
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
        showNotification('Check-in date cannot be in the past', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    if (checkOutDate <= checkInDate) {
        showNotification('Check-out date must be at least one day after check-in date', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

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
            showPaymentInterface(booking);
            closeModal();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('checkIn').min = today;
    document.getElementById('checkIn').value = today;
    document.getElementById('checkOut').min = tomorrowStr;
    document.getElementById('checkOut').value = tomorrowStr;
}

function setupLogoRotation() {
    const logo = document.querySelector('.logo-image');
    if (logo) {
        logo.addEventListener('click', function() {
            this.classList.add('rotating');
            setTimeout(() => {
                this.classList.remove('rotating');
            }, 600);
        });
    }
}

function setupWebSocketSync() {
    console.log('🔄 EventBridge real-time sync enabled');
    
    // Check for updates every 3 seconds (EventBridge triggers are near real-time)
    setInterval(async () => {
        try {
            const response = await fetch('/api/resorts');
            const newResorts = await response.json();
            
            if (JSON.stringify(newResorts) !== JSON.stringify(resorts)) {
                console.log('🔄 EventBridge update detected, refreshing...');
                resorts = newResorts;
                displayResorts();
            }
        } catch (error) {
            // Silent error handling
        }
    }, 3000);
}

let currentGalleryIndex = 0;
let currentGalleryImages = [];
let currentResortId = null;

function openGallery(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    currentResortId = resortId;
    currentGalleryImages = [];
    
    // Add main image
    if (resort.image) {
        currentGalleryImages.push({type: 'image', url: resort.image});
    }
    
    // Add gallery images
    if (resort.gallery) {
        const additionalImages = resort.gallery.split('\n').filter(img => img.trim());
        additionalImages.forEach(img => {
            currentGalleryImages.push({type: 'image', url: img});
        });
    }
    
    // Add videos
    if (resort.videos) {
        const videoUrls = resort.videos.split('\n').filter(url => url.trim());
        videoUrls.forEach(video => {
            currentGalleryImages.push({type: 'video', url: video});
        });
    }
    
    currentGalleryIndex = 0;
    
    document.getElementById('galleryTitle').textContent = resort.name;
    document.getElementById('galleryDescription').innerHTML = `
        <p><strong>Location:</strong> ${resort.location}</p>
        <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
        <p>${resort.description}</p>
    `;
    
    updateGalleryImage();
    setupGalleryThumbnails();
    
    document.getElementById('galleryModal').style.display = 'block';
}

function closeGallery() {
    // Stop current video
    const currentVideo = document.getElementById('currentVideo');
    if (currentVideo) {
        if (currentVideo.tagName === 'VIDEO') {
            currentVideo.pause();
            currentVideo.currentTime = 0;
        } else if (currentVideo.tagName === 'IFRAME') {
            currentVideo.src = currentVideo.src; // Reload iframe to stop
        }
    }
    
    document.getElementById('galleryModal').style.display = 'none';
}

function showBuffering() {
    const spinner = document.getElementById('bufferingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideBuffering() {
    const spinner = document.getElementById('bufferingSpinner');
    if (spinner) spinner.style.display = 'none';
    
    // Show mobile pause button on mobile devices
    if (window.innerWidth <= 768) {
        const pauseBtn = document.getElementById('mobilePauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'block';
    }
}

function toggleVideoPlayback() {
    const video = document.getElementById('currentVideo');
    const pauseBtn = document.getElementById('mobilePauseBtn');
    
    if (video && video.tagName === 'VIDEO') {
        if (video.paused) {
            video.play();
            pauseBtn.innerHTML = '⏸️';
        } else {
            video.pause();
            pauseBtn.innerHTML = '▶️';
        }
    }
}

function updateGalleryImage() {
    if (currentGalleryImages.length > 0) {
        const currentItem = currentGalleryImages[currentGalleryIndex];
        const container = document.querySelector('.gallery-images');
        
        if (currentItem.type === 'image') {
            container.innerHTML = `
                <img id="galleryMainImage" src="${currentItem.url}" alt="">
                <div class="gallery-controls">
                    <button id="galleryPrev">&lt;</button>
                    <button id="galleryNext">&gt;</button>
                </div>
            `;
        } else if (currentItem.type === 'video') {
            let videoHtml = '';
            if (currentItem.url.includes('youtube.com') || currentItem.url.includes('youtu.be')) {
                const videoId = currentItem.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                videoHtml = videoId ? `<iframe id="currentVideo" src="https://www.youtube.com/embed/${videoId[1]}?enablejsapi=1" frameborder="0" allowfullscreen style="width:100%;height:400px;border-radius:8px;"></iframe>` : '';
            } else if (currentItem.url.includes('.mp4') || currentItem.url.includes('.webm') || currentItem.url.includes('.ogg')) {
                videoHtml = `
                    <div class="video-container" style="position:relative;width:100%;height:400px;">
                        <video id="currentVideo" controls preload="metadata" style="width:100%;height:100%;border-radius:8px;" 
                               onloadstart="this.volume=0.5" 
                               onloadstart="showBuffering()" 
                               oncanplay="hideBuffering()" 
                               onwaiting="showBuffering()" 
                               onplaying="hideBuffering()">
                            <source src="${currentItem.url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div id="bufferingSpinner" class="buffering-spinner" style="display:none;">
                            <div class="spinner"></div>
                            <p>Loading...</p>
                        </div>
                        <button id="mobilePauseBtn" class="mobile-pause-btn" onclick="toggleVideoPlayback()" style="display:none;">⏸️</button>
                    </div>`;
            } else {
                videoHtml = `<div style="width:100%;height:400px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:8px;"><p>Video format not supported</p></div>`;
            }
            
            container.innerHTML = `
                ${videoHtml}
                <div class="gallery-controls">
                    <button id="galleryPrev">&lt;</button>
                    <button id="galleryNext">&gt;</button>
                </div>
            `;
        }
        
        // Re-attach event listeners
        document.getElementById('galleryPrev').onclick = () => prevImage(currentResortId);
        document.getElementById('galleryNext').onclick = () => nextImage(currentResortId);
    }
}

function setupGalleryThumbnails() {
    const thumbnailsContainer = document.getElementById('galleryThumbnails');
    thumbnailsContainer.innerHTML = currentGalleryImages.map((item, index) => {
        if (item.type === 'image') {
            return `<img src="${item.url}" class="gallery-thumbnail ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})">`;
        } else {
            // Create video thumbnail with proper play icon
            let videoThumb = '';
            if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
                const videoId = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId[1]}/hqdefault.jpg` : '';
                videoThumb = `<div class="gallery-thumbnail video-thumbnail ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})" style="background-image:url('${thumbUrl}');background-size:cover;background-position:center;position:relative;"><div class="play-overlay">▶</div></div>`;
            } else {
                videoThumb = `<div class="gallery-thumbnail video-thumb ${index === currentGalleryIndex ? 'active' : ''}" onclick="setGalleryImage(${index})" style="background:#333;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;position:relative;"><div class="play-overlay">▶</div></div>`;
            }
            return videoThumb;
        }
    }).join('');
}

// Remove separate video section - videos now in slideshow

function setGalleryImage(index) {
    currentGalleryIndex = index;
    updateGalleryImage();
    setupGalleryThumbnails();
}

function nextImage(resortId) {
    if (currentGalleryImages.length > 1) {
        currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
        updateGalleryImage();
        setupGalleryThumbnails();
    }
}

function prevImage(resortId) {
    if (currentGalleryImages.length > 1) {
        currentGalleryIndex = currentGalleryIndex === 0 ? currentGalleryImages.length - 1 : currentGalleryIndex - 1;
        updateGalleryImage();
        setupGalleryThumbnails();
    }
}



function showPaymentInterface(booking) {
    const paymentModal = document.createElement('div');
    paymentModal.className = 'payment-modal';
    paymentModal.innerHTML = `
        <div class="payment-content">
            <h2>💳 Complete Payment</h2>
            <div class="booking-summary">
                <h3>Booking Details</h3>
                <p><strong>Resort:</strong> ${booking.resortName}</p>
                <p><strong>Guest:</strong> ${booking.guestName}</p>
                <p><strong>Base Price:</strong> ₹${(booking.basePrice || booking.totalPrice || 0).toLocaleString()}</p>
                <p><strong>Platform Fee (1.5%):</strong> ₹${(booking.platformFee || Math.round((booking.totalPrice || 0) * 0.015)).toLocaleString()}</p>
                <p><strong>Total Amount:</strong> ₹${(booking.totalPrice || 0).toLocaleString()}</p>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
            </div>
            
            <div class="upi-payment">
                <h3>🔗 UPI Payment</h3>
                <div class="qr-section">
                    <img src="qr-code.png.jpeg" alt="UPI QR Code" class="qr-code" onload="console.log('QR loaded')" onerror="console.error('QR failed to load')">
                    <p><strong>UPI ID:</strong> vizagresorts@ybl</p>
                    <p><strong>Amount:</strong> ₹${(booking.totalPrice || 0).toLocaleString()}</p>
                </div>
                
                <div class="payment-instructions">
                    ${(booking.paymentDetails?.instructions || ['1. Scan QR code', '2. Pay amount', '3. Enter transaction ID']).map(instruction => `<p>• ${instruction}</p>`).join('')}
                </div>
                
                <div class="payment-proof">
                    <h4>Upload Payment Proof</h4>
                    <input type="text" id="transactionId" placeholder="Please enter your 12-digit UTR number" maxlength="12" pattern="[0-9]{12}" required>
                    <button onclick="confirmPayment(${booking.id})" class="confirm-payment-btn">
                        ✅ Confirm Payment
                    </button>
                </div>
            </div>
            
            <div class="payment-actions">
                <button onclick="cancelPayment()" class="cancel-payment-btn">Cancel Payment</button>
                <button onclick="closePaymentModal()" class="close-payment-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
}

function closePaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        modal.remove();
    }
}

function cancelPayment() {
    if (confirm('Are you sure you want to cancel this payment? You will return to the main page.')) {
        closePaymentModal();
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNotification('Payment cancelled. You can try booking again.', 'error');
    }
}

async function confirmPayment(bookingId) {
    const transactionId = document.getElementById('transactionId').value;
    
    if (!transactionId) {
        showNotification('Please enter your 12-digit UTR number', 'error');
        return;
    }
    
    if (!/^[0-9]{12}$/.test(transactionId)) {
        showNotification('UTR number must be exactly 12 digits', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/payment-proof`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactionId })
        });
        
        if (response.ok) {
            showNotification('Your booking payment is being verified. You will be notified through email.', 'success');
            closePaymentModal();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Payment confirmation failed', 'error');
        }
    } catch (error) {
        console.error('Payment confirmation error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Chatbot functionality
function toggleChatbot() {
    const window = document.getElementById('chatbot-window');
    window.style.display = window.style.display === 'none' ? 'block' : 'none';
}

function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Send message to admin and show typing indicator
    addChatMessage('Admin is typing...', 'bot');
    
    // Send to admin via API
    fetch('/api/chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: message,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId()
        })
    }).catch(err => console.error('Chat error:', err));
    
    // Auto-response after 30 seconds if no manual reply
    setTimeout(() => {
        const lastMessage = document.querySelector('.bot-message:last-child');
        if (lastMessage && lastMessage.textContent === 'Admin is typing...') {
            lastMessage.textContent = getBotResponse(message);
        }
    }, 30000);
}

function addChatMessage(message, type) {
    const messages = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = type + '-message';
    div.textContent = message;
    messages.appendChild(div);
    
    // Auto-scroll to bottom
    setTimeout(() => {
        messages.scrollTop = messages.scrollHeight;
    }, 100);
}

function getBotResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('price') || msg.includes('cost')) {
        return 'Our resort prices start from ₹2,000 per night. Check our resorts above for exact pricing!';
    } else if (msg.includes('booking') || msg.includes('book')) {
        return 'To book a resort, click "Book Now" on any resort card above. We accept UPI payments!';
    } else if (msg.includes('location') || msg.includes('where')) {
        return 'We have resorts in Vizag, S.R Puram, S Kota, Narava, Pinagadi, and Pendurthi areas.';
    } else if (msg.includes('contact') || msg.includes('phone')) {
        return 'You can contact us at vizagresortbooking@gmail.com or book directly through our website!';
    } else if (msg.includes('hi') || msg.includes('hello')) {
        return 'Hello! Welcome to Vizag Resorts. How can I help you with your booking today?';
    } else {
        return 'I can help you with resort bookings, prices, locations, and contact information. What would you like to know?';
    }
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function getSessionId() {
    let sessionId = localStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
}

// Listen for admin replies
let replyCheckInterval = setInterval(() => {
    fetch(`/api/chat-replies/${getSessionId()}`)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            if (data.reply) {
                // Replace typing message with admin reply
                const lastMessage = document.querySelector('.bot-message:last-child');
                if (lastMessage && lastMessage.textContent === 'Admin is typing...') {
                    lastMessage.textContent = data.reply;
                    // Auto-scroll after reply
                    const messages = document.getElementById('chatbot-messages');
                    setTimeout(() => {
                        messages.scrollTop = messages.scrollHeight;
                    }, 100);
                }
            }
        })
        .catch(err => {
            // Silently handle errors to avoid console spam
            if (err.message !== 'Network response was not ok') {
                console.error('Reply check error:', err);
            }
        });
}, 5000); // Increased interval to reduce server load

// Rating functionality
function setupRatingStars() {
    document.querySelectorAll('.rating-container').forEach(container => {
        const stars = container.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                highlightStars(stars, index + 1);
            });
            
            star.addEventListener('mouseleave', () => {
                const rating = container.dataset.userRating || 0;
                highlightStars(stars, rating);
            });
            
            star.addEventListener('click', () => {
                const rating = index + 1;
                container.dataset.userRating = rating;
                highlightStars(stars, rating);
                showNotification(`You rated this resort ${rating} star${rating > 1 ? 's' : ''}!`, 'success');
            });
        });
    });
}

function highlightStars(stars, rating) {
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
    });
}

// Call setup after resorts are displayed
function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <div class="resort-gallery">
                <img src="${resort.image}" alt="${resort.name}" class="resort-image main-image">
                ${(resort.gallery || resort.videos) ? `
                    <button class="view-more-btn" onclick="openGallery(${resort.id})">
                        📸 View More
                    </button>
                ` : ''}
            </div>
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location">
                    📍 ${resort.location}
                    ${resort.map_link ? `<br><a href="${resort.map_link}" target="_blank" class="view-map-btn">🗺️ View Map</a>` : ''}
                </p>
                <p class="resort-price">₹${resort.price.toLocaleString()}/night</p>
                <p class="resort-description">${resort.description}</p>
                <button class="book-btn" onclick="openBookingModal(${resort.id})">
                    Book Now
                </button>
                <div class="resort-footer">
                    <div class="review-stars">
                        <div class="rating-container" data-resort-id="${resort.id}">
                            <span class="star" data-rating="1">☆</span>
                            <span class="star" data-rating="2">☆</span>
                            <span class="star" data-rating="3">☆</span>
                            <span class="star" data-rating="4">☆</span>
                            <span class="star" data-rating="5">☆</span>
                        </div>
                        <span class="review-text">Rate this resort</span>
                    </div>
                    <div class="cancellation-policy">
                        <a href="Booking cancellation_policy.pdf" target="_blank" class="policy-text">Cancellation Policy</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Setup rating functionality after DOM is updated
    setTimeout(setupRatingStars, 100);
}