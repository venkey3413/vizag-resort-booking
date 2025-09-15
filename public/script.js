let resorts = [];
let filteredResorts = [];
let currentPage = 1;
const itemsPerPage = 6;
let socket;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
    setMinDate();
    initializeSocket();
    setupImageHandling();
    setupStarRating();
    loadRazorpayScript();
});

function initializeSocket() {
    try {
        if (typeof io !== 'undefined') {
            socket = io();
            
            socket.on('resortAdded', (resort) => {
                resorts.unshift(resort);
                displayResorts();
                populateLocationFilter();
            });
            
            socket.on('resortUpdated', (updatedResort) => {
                const index = resorts.findIndex(r => r.id === updatedResort.id);
                if (index !== -1) {
                    resorts[index] = { ...resorts[index], ...updatedResort };
                    displayResorts();
                    populateLocationFilter();
                }
            });
            
            socket.on('resortDeleted', (data) => {
                resorts = resorts.filter(r => r.id !== data.id);
                displayResorts();
                populateLocationFilter();
            });
            
            socket.on('resortAvailabilityUpdated', (data) => {
                const resort = resorts.find(r => r.id === data.id);
                if (resort) {
                    resort.available = data.available;
                    displayResorts();
                }
            });
            
            socket.on('bookingDeleted', (data) => {
                console.log('Booking deleted, refreshing resort availability');
                loadResorts(); // Reload resorts to update availability
            });
        }
    } catch (error) {
        console.log('Socket.IO not available, continuing without real-time updates');
    }
}

function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            closeMobileMenu();
        });
    });

    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }

    // CTA button
    const ctaBtn = document.querySelector('.cta-btn');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', function() {
            scrollToSection('resorts');
        });
    }

    // Search and filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterResorts);
    }

    ['locationFilter', 'priceFilter', 'amenityFilter', 'guestFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', filterResorts);
        }
    });

    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('locationFilter').value = '';
            document.getElementById('priceFilter').value = '';
            document.getElementById('amenityFilter').value = '';
            document.getElementById('guestFilter').value = '';
            filteredResorts = resorts;
            currentPage = 1;
            displayResortsWithPagination();
        });
    }

    // Booking form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBooking);
    }

    // Date inputs
    const checkIn = document.getElementById('checkIn');
    const checkOut = document.getElementById('checkOut');
    const guests = document.getElementById('guests');
    
    if (checkIn) checkIn.addEventListener('change', calculateTotal);
    if (checkOut) checkOut.addEventListener('change', calculateTotal);
    if (guests) guests.addEventListener('change', calculateTotal);

    // Discount button
    const applyDiscount = document.getElementById('applyDiscount');
    if (applyDiscount) {
        applyDiscount.addEventListener('click', function() {
            const code = document.getElementById('discountCode').value.trim().toUpperCase();
            const messageDiv = document.getElementById('discountMessage');
            const applyBtn = this;
            const originalText = applyBtn.innerHTML;
            
            if (!code) {
                messageDiv.innerHTML = '<span style="color: #f44336;">Please enter a discount code</span>';
                return;
            }
            
            applyBtn.innerHTML = 'Loading...';
            applyBtn.disabled = true;
            
            fetch(`/api/discount-codes/validate/${code}`)
                .then(response => response.json())
                .then(result => {
                    if (result.valid) {
                        const bookingAmount = parseInt(document.getElementById('bookingAmount').textContent.replace(/[₹,]/g, ''));
                        
                        if (bookingAmount < result.discount.min_amount) {
                            messageDiv.innerHTML = `<span style="color: #f44336;">Minimum order amount ₹${result.discount.min_amount} required</span>`;
                            return;
                        }
                        
                        appliedDiscount = result.discount;
                        const discountText = result.discount.discount_type === 'percentage' 
                            ? `${result.discount.discount_value}% off` 
                            : `₹${result.discount.discount_value} off`;
                        messageDiv.innerHTML = `<span style="color: #27ae60;">✓ ${discountText} applied!</span>`;
                        calculateTotal();
                    } else {
                        messageDiv.innerHTML = `<span style="color: #f44336;">${result.message || 'Invalid discount code'}</span>`;
                        appliedDiscount = null;
                        calculateTotal();
                    }
                })
                .catch(error => {
                    messageDiv.innerHTML = '<span style="color: #f44336;">Network error. Please try again.</span>';
                    appliedDiscount = null;
                    calculateTotal();
                })
                .finally(() => {
                    applyBtn.innerHTML = originalText;
                    applyBtn.disabled = false;
                });
        });
    }

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Click outside modal to close
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Event delegation for resort interactions
    document.addEventListener('click', function(e) {
        // Book button
        if (e.target.closest('.book-btn') && !e.target.closest('.book-btn').disabled) {
            const resortId = parseInt(e.target.closest('.book-btn').dataset.resortId);
            openBookingModal(resortId);
        }
        
        // Review button
        if (e.target.closest('.review-btn')) {
            const resortId = parseInt(e.target.closest('.review-btn').dataset.resortId);
            openReviewModal(resortId);
        }
        
        // Image slider - open details
        if (e.target.closest('.image-slider')) {
            const resortId = parseInt(e.target.closest('.image-slider').dataset.resortId);
            openResortDetails(resortId);
        }
        
        // Image navigation
        if (e.target.closest('.image-navigation')) {
            e.stopPropagation();
            const btn = e.target.closest('.image-navigation');
            const resortId = parseInt(btn.dataset.resortId);
            const direction = parseInt(btn.dataset.direction);
            changeCardImage(resortId, direction, e);
        }
        
        // Image dots
        if (e.target.closest('.dot')) {
            e.stopPropagation();
            const dot = e.target.closest('.dot');
            const resortId = parseInt(dot.dataset.resortId);
            const index = parseInt(dot.dataset.index);
            setCardImage(resortId, index, e);
        }
        
        // Pagination
        if (e.target.closest('.pagination button')) {
            const page = parseInt(e.target.closest('.pagination button').dataset.page);
            if (page) changePage(page);
        }
    });
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    navLinks.classList.toggle('active');
    toggle.classList.toggle('active');
}

function closeMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    navLinks.classList.remove('active');
    toggle.classList.remove('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    const navLinks = document.querySelector('.nav-links');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
        closeMobileMenu();
    }
});

// Image optimization - lazy loading handler
function setupImageHandling() {
    // Add load event listeners to all lazy images
    function handleImageLoad() {
        document.addEventListener('load', function(e) {
            if (e.target.tagName === 'IMG' && e.target.hasAttribute('loading')) {
                e.target.classList.add('loaded');
            }
        }, true);
        
        // Handle images that are already loaded
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', function() {
                    this.classList.add('loaded');
                });
            }
        });
    }
    
    handleImageLoad();
    
    // Re-run when new images are added (for dynamic content)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const lazyImages = node.querySelectorAll ? node.querySelectorAll('img[loading="lazy"]') : [];
                        lazyImages.forEach(img => {
                            if (img.complete) {
                                img.classList.add('loaded');
                            } else {
                                img.addEventListener('load', function() {
                                    this.classList.add('loaded');
                                });
                            }
                        });
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Review system functions
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="stars">★</span>';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '<span class="stars">☆</span>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="stars" style="color: #ddd;">★</span>';
    }
    
    return stars;
}

function openReviewModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    document.getElementById('reviewResortId').value = resortId;
    document.getElementById('reviewerName').value = '';
    document.getElementById('reviewText').value = '';
    document.getElementById('selectedRating').value = '';
    
    // Reset star rating
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('active');
    });
    
    document.getElementById('reviewModal').style.display = 'block';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

// Star rating interaction
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            document.getElementById('selectedRating').value = rating;
            
            // Update visual state
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.style.color = '#ffc107';
                } else {
                    s.style.color = '#ddd';
                }
            });
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', function() {
        const selectedRating = parseInt(document.getElementById('selectedRating').value) || 0;
        stars.forEach((s, index) => {
            if (index < selectedRating) {
                s.style.color = '#ffc107';
            } else {
                s.style.color = '#ddd';
            }
        });
    });
    
    // Review form submission
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmission);
    }
}

async function handleReviewSubmission(e) {
    e.preventDefault();
    
    const reviewData = {
        resortId: document.getElementById('reviewResortId').value,
        guestName: document.getElementById('reviewerName').value,
        rating: document.getElementById('selectedRating').value,
        reviewText: document.getElementById('reviewText').value
    };
    
    if (!reviewData.rating) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    try {
            const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });
        
        if (response.ok) {
            showNotification('Thank you for your review! It will be published after approval.', 'success');
            closeReviewModal();
        } else {
            const error = await response.json();
            showNotification('Failed to submit review: ' + (error.error || 'Please try again'), 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadResorts() {
    showLoading('Loading resorts...');
    try {
            const response = await fetch('/api/resorts');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        resorts = await response.json();
        filteredResorts = resorts;
        displayResortsWithPagination();
        populateLocationFilter();
        populateAmenityFilter();
        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Failed to load resorts. Please check your connection.', () => loadResorts());
        console.error('Error loading resorts:', error);
    }
}

function showLoading(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function showError(message, retryCallback = null) {
    const container = document.getElementById('resortsGrid');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            ${retryCallback ? '<button class="error-retry" onclick="' + retryCallback.name + '()"><i class="fas fa-redo"></i> Retry</button>' : ''}
        </div>
    `;
}

function displayResorts(filteredResorts = resorts) {
    const grid = document.getElementById('resortsGrid');
    
    if (filteredResorts.length === 0) {
        grid.innerHTML = `
            <div class="error-message" style="grid-column: 1/-1; background: rgba(255,255,255,0.9); color: #666;">
                <i class="fas fa-search"></i>
                <span>No resorts match your search criteria. Try adjusting your filters.</span>
                <button class="error-retry" onclick="clearFilters()">Clear Filters</button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredResorts.map(resort => `
        <div class="resort-card" data-resort-id="${resort.id}">
            <div class="image-gallery">
                <div class="image-slider" data-resort-id="${resort.id}">
                    ${(() => {
                        if (resort.images && resort.images.length > 0) {
                            return resort.images.map((media, index) => {
                                const isVideo = media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov') || media.toLowerCase().includes('.avi') || media.toLowerCase().includes('.webm');
                                if (isVideo) {
                                    return `<video src="${media}" class="resort-image ${index === 0 ? 'active' : ''}" data-resort="${resort.id}" data-index="${index}" controls muted loop preload="metadata"></video>`;
                                } else {
                                    return `<img src="${media}" alt="${resort.name}" class="resort-image ${index === 0 ? 'active' : ''}" data-resort="${resort.id}" data-index="${index}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 400 200\\"><rect fill=\\"%23ecf0f1\\" width=\\"400\\" height=\\"200\\"/><text x=\\"200\\" y=\\"100\\" text-anchor=\\"middle\\" fill=\\"%237f8c8d\\" font-size=\\"16\\">Image Error</text></svg>'">`;
                                }
                            }).join('');
                        }
                        return '<img src="data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 400 200\\"><rect fill=\\"%23ecf0f1\\" width=\\"400\\" height=\\"200\\"/><text x=\\"200\\" y=\\"100\\" text-anchor=\\"middle\\" fill=\\"%237f8c8d\\" font-size=\\"16\\">No Media</text></svg>" alt="${resort.name}" class="resort-image active">';
                    })()}
                </div>
                ${resort.images && resort.images.length > 1 ? `
                    <button class="image-navigation prev-nav" data-resort-id="${resort.id}" data-direction="-1">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="image-navigation next-nav" data-resort-id="${resort.id}" data-direction="1">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="image-dots">
                        ${resort.images.map((_, index) => 
                            `<span class="dot ${index === 0 ? 'active' : ''}" data-resort-id="${resort.id}" data-index="${index}"></span>`
                        ).join('')}
                    </div>
                    <div class="image-count">${resort.images.length} media</div>
                ` : ''}
            </div>
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p class="resort-location">
                    <i class="fas fa-map-marker-alt"></i> ${resort.location}
                    ${resort.map_link ? `<a href="${resort.map_link}" target="_blank" class="map-link"><i class="fas fa-external-link-alt"></i> View on Map</a>` : ''}
                </p>
                <p class="resort-price">₹${resort.price.toLocaleString()}/night</p>
                <div class="resort-rating">
                    ${generateStarRating(resort.rating || 0)}
                    <span class="rating-text">${resort.rating ? resort.rating.toFixed(1) : 'No reviews'} ${resort.review_count ? `(${resort.review_count} reviews)` : ''}</span>
                </div>
                <p class="resort-description">${resort.description}</p>
                <div class="amenities">
                    ${resort.amenities.map(amenity => `<span class="amenity">${amenity}</span>`).join('')}
                </div>

                ${resort.available ? 
                    `<button class="book-btn" data-resort-id="${resort.id}">
                        <i class="fas fa-calendar-check"></i> Book Now
                    </button>
                    <div style="overflow: hidden; margin-top: 1rem;">
                        <button class="review-btn" data-resort-id="${resort.id}">
                            <i class="fas fa-star"></i> Write Review
                        </button>
                        <div class="policy-link">
                            <a href="Booking cancellation_policy.pdf" target="_blank" class="pdf-link">
                                <i class="fas fa-file-pdf"></i> Cancellation Policy
                            </a>
                        </div>
                    </div>` : 
                    `<button class="book-btn unavailable" disabled>
                        <i class="fas fa-times-circle"></i> Currently Unavailable
                    </button>
                    <button class="review-btn" data-resort-id="${resort.id}">
                        <i class="fas fa-star"></i> Write Review
                    </button>`
                }
            </div>
        </div>
    `).join('');
}

// Inline image browsing functions
function changeCardImage(resortId, direction, event) {
    event.stopPropagation();
    const card = document.querySelector(`[data-resort-id="${resortId}"]`);
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    let currentIndex = 0;
    images.forEach((img, index) => {
        if (img.classList.contains('active')) {
            currentIndex = index;
        }
        img.classList.remove('active');
    });
    
    dots.forEach(dot => dot.classList.remove('active'));
    
    currentIndex += direction;
    if (currentIndex >= images.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = images.length - 1;
    
    images[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
}

function setCardImage(resortId, index, event) {
    event.stopPropagation();
    const card = document.querySelector(`[data-resort-id="${resortId}"]`);
    const images = card.querySelectorAll('.resort-image');
    const dots = card.querySelectorAll('.dot');
    
    images.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    images[index].classList.add('active');
    dots[index].classList.add('active');
}

function populateLocationFilter() {
    const filter = document.getElementById('locationFilter');
    const locations = [...new Set(resorts.map(resort => resort.location))];
    
    filter.innerHTML = '<option value="">All Locations</option>' + 
        locations.map(location => `<option value="${location}">${location}</option>`).join('');
}

function populateAmenityFilter() {
    const filter = document.getElementById('amenityFilter');
    const allAmenities = new Set();
    
    resorts.forEach(resort => {
        if (resort.amenities && Array.isArray(resort.amenities)) {
            resort.amenities.forEach(amenity => allAmenities.add(amenity));
        }
    });
    
    const amenities = Array.from(allAmenities).sort();
    filter.innerHTML = '<option value="">All Amenities</option>' + 
        amenities.map(amenity => `<option value="${amenity}">${amenity}</option>`).join('');
}

function filterResorts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    const amenityFilter = document.getElementById('amenityFilter').value;
    const guestFilter = document.getElementById('guestFilter').value;
    
    filteredResorts = resorts.filter(resort => {
        // Search filter
        const matchesSearch = resort.name.toLowerCase().includes(searchTerm) || 
                            resort.location.toLowerCase().includes(searchTerm) ||
                            resort.description.toLowerCase().includes(searchTerm);
        
        // Location filter
        const matchesLocation = !locationFilter || resort.location === locationFilter;
        
        // Price filter
        let matchesPrice = true;
        if (priceFilter) {
            const [minPrice, maxPrice] = priceFilter.split('-').map(Number);
            matchesPrice = resort.price >= minPrice && resort.price <= maxPrice;
        }
        
        // Amenity filter
        const matchesAmenity = !amenityFilter || 
            (resort.amenities && resort.amenities.includes(amenityFilter));
        
        // Guest capacity filter
        let matchesGuests = true;
        if (guestFilter) {
            const [minGuests, maxGuests] = guestFilter.split('-').map(Number);
            const resortCapacity = resort.max_guests || 10;
            matchesGuests = resortCapacity >= minGuests && 
                          (maxGuests === 999 || resortCapacity <= maxGuests);
        }
        
        return matchesSearch && matchesLocation && matchesPrice && 
               matchesAmenity && matchesGuests;
    });
    
    currentPage = 1;
    displayResortsWithPagination();
}

function displayResortsWithPagination() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResorts = filteredResorts.slice(startIndex, endIndex);
    
    displayResorts(paginatedResorts);
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredResorts.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `<button data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> Previous
    </button>`;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="page-info">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button data-page="${i}" ${i === currentPage ? 'class="active"' : ''}>${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-info">...</span>`;
        }
        paginationHTML += `<button data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
        Next <i class="fas fa-chevron-right"></i>
    </button>`;
    
    // Results info
    const startResult = (currentPage - 1) * itemsPerPage + 1;
    const endResult = Math.min(currentPage * itemsPerPage, filteredResorts.length);
    paginationHTML += `<span class="page-info">Showing ${startResult}-${endResult} of ${filteredResorts.length} resorts</span>`;
    
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredResorts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayResortsWithPagination();
    
    // Scroll to top of resorts section
    document.getElementById('resorts').scrollIntoView({ behavior: 'smooth' });
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('priceFilter').value = '';
    document.getElementById('amenityFilter').value = '';
    document.getElementById('guestFilter').value = '';
    filteredResorts = resorts;
    currentPage = 1;
    displayResortsWithPagination();
}

function openBookingModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const modal = document.getElementById('bookingModal');
    document.getElementById('bookingResortId').value = resortId;
    document.getElementById('resortPrice').value = resort.price;
    document.getElementById('modalResortName').textContent = `Book ${resort.name}`;
    document.getElementById('pricePerNight').textContent = `₹${resort.price.toLocaleString()}`;
    
    const guestsInput = document.getElementById('guests');
    const maxGuests = resort.max_guests || 20;
    guestsInput.max = maxGuests;
    document.getElementById('maxGuestsCount').textContent = maxGuests;
    
    // Show booked dates info
    showBookedDatesInfo(resort);
    
    calculateTotal();
    validateBookingDates();
    modal.style.display = 'block';
}

function showBookedDatesInfo(resort) {
    let infoDiv = document.getElementById('bookedDatesInfo');
    if (!infoDiv) {
        infoDiv = document.createElement('div');
        infoDiv.id = 'bookedDatesInfo';
        infoDiv.style.cssText = 'background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 0.9em;';
        
        const form = document.getElementById('bookingForm');
        const firstInput = form.querySelector('input');
        form.insertBefore(infoDiv, firstInput);
    }
    
    if (resort.bookedDates && resort.bookedDates.length > 0) {
        const bookedRanges = resort.bookedDates.map(booking => {
            const checkIn = new Date(booking.checkIn).toLocaleDateString();
            const checkOut = new Date(booking.checkOut).toLocaleDateString();
            return `${checkIn} to ${checkOut}`;
        }).join(', ');
        
        infoDiv.innerHTML = `<i class="fas fa-info-circle"></i> <strong>Unavailable dates:</strong> ${bookedRanges}`;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

let appliedDiscount = null;

function calculateTotal() {
    const resortId = parseInt(document.getElementById('bookingResortId').value);
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    const basePrice = resort.price;
    const guests = parseInt(document.getElementById('guests').value) || 1;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    let nights = 1;
    if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const timeDiff = endDate.getTime() - startDate.getTime();
        nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    }
    
    const bookingAmount = basePrice * nights;
    const platformFee = Math.round(bookingAmount * 0.015); // 1.5% platform fee
    let discountAmount = 0;
    
    // Apply discount if available
    if (appliedDiscount) {
        if (appliedDiscount.discount_type === 'percentage') {
            discountAmount = Math.round(bookingAmount * (appliedDiscount.discount_value / 100));
        } else {
            discountAmount = appliedDiscount.discount_value;
        }
        
        // Show discount row
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('discountAmount').textContent = `-₹${discountAmount.toLocaleString()}`;
    } else {
        document.getElementById('discountRow').style.display = 'none';
    }
    
    const total = Math.max(0, bookingAmount + platformFee - discountAmount);
    
    document.getElementById('pricePerNight').textContent = `₹${basePrice.toLocaleString()} per night`;
    document.getElementById('bookingAmount').textContent = `₹${bookingAmount.toLocaleString()}`;
    document.getElementById('platformFee').textContent = `₹${platformFee.toLocaleString()}`;
    document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
}



function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
    document.getElementById('totalAmount').textContent = '₹0';
}

async function handleBooking(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Validation
    const phoneInput = document.getElementById('phone').value.trim();
    // Remove any non-digit characters and validate
    const cleanPhone = phoneInput.replace(/[^0-9]/g, '');
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
        showNotification('Please enter a valid 10-digit mobile number', 'error');
        return;
    }

    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    if (!checkIn || !checkOut) {
        showNotification('Please select check-in and check-out dates', 'error');
        return;
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
        showNotification('Check-out date must be after check-in date', 'error');
        return;
    }

    // Show loading state
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
    submitBtn.disabled = true;

    const bookingData = {
        resortId: document.getElementById('bookingResortId').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: cleanPhone, // send only digits
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
            const bookingId = booking.id || booking.bookingId || 'Unknown';
            const totalPrice = booking.totalPrice || booking.total_price || 0;
            showNotification(`Booking confirmed!\n\nBooking ID: RB${String(bookingId).padStart(4, '0')}\nTotal: ₹${totalPrice.toLocaleString()}\n\nPay via WhatsApp now!`, 'success');
            closeModal();
            document.getElementById('bookingForm').reset();
            appliedDiscount = null;
        } else {
            let errorMsg = 'Please try again';
            try {
                const errorText = await response.text();
                console.log('Server response:', errorText);
                try {
                    const error = JSON.parse(errorText);
                    errorMsg = error.error || errorMsg;
                } catch (parseErr) {
                    errorMsg = 'Server error: ' + response.status + ' - ' + errorText.substring(0, 100);
                }
            } catch (err) {
                errorMsg = 'Booking failed: ' + response.status;
            }
            showNotification('Booking failed: ' + errorMsg, 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('Booking failed: ' + error.message, 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}



// Custom notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            .notification.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .notification.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .notification.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            .notification-content { display: flex; justify-content: space-between; align-items: flex-start; }
            .notification-message { flex: 1; white-space: pre-line; }
            .notification-close { background: none; border: none; font-size: 20px; cursor: pointer; margin-left: 10px; }
            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function setMinDate() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Set date inputs (no time selection)
    document.getElementById('checkIn').value = todayStr;
    document.getElementById('checkIn').min = todayStr;
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    document.getElementById('checkOut').value = tomorrowStr;
    document.getElementById('checkOut').min = tomorrowStr;
    
    document.getElementById('checkIn').addEventListener('change', function() {
        const checkInDate = new Date(this.value);
        const nextDay = new Date(checkInDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const minCheckOut = nextDay.toISOString().split('T')[0];
        document.getElementById('checkOut').min = minCheckOut;
        if (document.getElementById('checkOut').value <= this.value) {
            document.getElementById('checkOut').value = minCheckOut;
        }
        validateBookingDates();
    });
    
    document.getElementById('checkOut').addEventListener('change', validateBookingDates);
    
    document.getElementById('phone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });
}

function validateBookingDates() {
    const resortId = parseInt(document.getElementById('bookingResortId').value);
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    if (!resortId || !checkIn || !checkOut) return;
    
    const resort = resorts.find(r => r.id === resortId);
    if (!resort || !resort.bookedDates) return;
    
    const selectedCheckIn = new Date(checkIn);
    const selectedCheckOut = new Date(checkOut);
    
    // Check if selected dates overlap with booked dates
    const isOverlapping = resort.bookedDates.some(booking => {
        const bookedCheckIn = new Date(booking.checkIn);
        const bookedCheckOut = new Date(booking.checkOut);
        
        return (selectedCheckIn < bookedCheckOut && selectedCheckOut > bookedCheckIn);
    });
    
    const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
    const warningDiv = document.getElementById('dateWarning') || createWarningDiv();
    
    if (isOverlapping) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        warningDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Selected dates are not available. Please choose different dates.';
        warningDiv.style.display = 'block';
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        warningDiv.style.display = 'none';
    }
}

function createWarningDiv() {
    const warningDiv = document.createElement('div');
    warningDiv.id = 'dateWarning';
    warningDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin: 10px 0; display: none;';
    
    const form = document.getElementById('bookingForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    form.insertBefore(warningDiv, submitBtn);
    
    return warningDiv;
}

let currentResortImages = [];
let currentImageIndex = 0;

function openResortDetails(resortId) {
    console.log('Opening resort details for ID:', resortId);
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) {
        console.log('Resort not found!');
        return;
    }
    
    console.log('Resort found:', resort.name);
    
    currentResortImages = [];
    if (resort.images && Array.isArray(resort.images) && resort.images.length > 0) {
        currentResortImages = resort.images;
    } else {
        currentResortImages = ['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="%23ecf0f1" width="400" height="200"/><text x="200" y="100" text-anchor="middle" fill="%237f8c8d" font-size="16">No Image Available</text></svg>'];
    }
    
    currentImageIndex = 0;
    updateMainImage();
    
    const thumbnailContainer = document.getElementById('thumbnailImages');
    if (thumbnailContainer) {
        thumbnailContainer.innerHTML = currentResortImages.map((media, index) => {
            const isVideo = media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov') || media.toLowerCase().includes('.avi') || media.toLowerCase().includes('.webm');
            if (isVideo) {
                return `<video src="${media}" class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(${index})" muted preload="metadata"></video>`;
            } else {
                return `<img src="${media}" alt="${resort.name}" class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(${index})" loading="lazy">`;
            }
        }).join('');
    }
    
    const elements = {
        totalImages: document.getElementById('totalImages'),
        detailsResortName: document.getElementById('detailsResortName'),
        detailsLocation: document.getElementById('detailsLocation'),
        detailsPrice: document.getElementById('detailsPrice'),
        detailsDescription: document.getElementById('detailsDescription'),
        detailsAmenities: document.getElementById('detailsAmenities')
    };
    
    if (elements.totalImages) elements.totalImages.textContent = currentResortImages.length;
    if (elements.detailsResortName) elements.detailsResortName.textContent = resort.name;
    if (elements.detailsLocation) {
        elements.detailsLocation.innerHTML = `
            <i class="fas fa-map-marker-alt"></i> ${resort.location}
            ${resort.map_link ? `<br><a href="${resort.map_link}" target="_blank" class="map-link"><i class="fas fa-external-link-alt"></i> View on Google Maps</a>` : ''}
        `;
    }
    if (elements.detailsPrice) elements.detailsPrice.textContent = `₹${resort.price.toLocaleString()}/night`;
    if (elements.detailsDescription) elements.detailsDescription.textContent = resort.description;
    if (elements.detailsAmenities) {
        elements.detailsAmenities.innerHTML = resort.amenities.map(amenity => 
            `<span class="amenity">${amenity}</span>`
        ).join('');
    }
    
    const modal = document.getElementById('resortDetailsModal');
    if (modal) {
        console.log('Showing modal');
        modal.style.display = 'block';
    } else {
        console.log('Modal not found!');
    }
}

function updateMainImage() {
    const mainElement = document.getElementById('mainResortImage');
    const currentMedia = currentResortImages[currentImageIndex];
    const isVideo = currentMedia.toLowerCase().includes('.mp4') || currentMedia.toLowerCase().includes('.mov') || currentMedia.toLowerCase().includes('.avi') || currentMedia.toLowerCase().includes('.webm');
    
    if (isVideo) {
        mainElement.outerHTML = `<video id="mainResortImage" src="${currentMedia}" class="main-resort-image" controls muted loop preload="metadata"></video>`;
    } else {
        mainElement.outerHTML = `<img id="mainResortImage" src="${currentMedia}" alt="" class="main-resort-image" loading="lazy">`;
    }
    
    document.getElementById('currentImageIndex').textContent = currentImageIndex + 1;
    
    document.querySelectorAll('.thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentImageIndex);
    });
}

function changeMainImage(index) {
    currentImageIndex = index;
    updateMainImage();
}

function previousImage() {
    currentImageIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentResortImages.length - 1;
    updateMainImage();
}

function nextImage() {
    currentImageIndex = currentImageIndex < currentResortImages.length - 1 ? currentImageIndex + 1 : 0;
    updateMainImage();
}

function closeResortDetails() {
    document.getElementById('resortDetailsModal').style.display = 'none';
}

function openBookingFromDetails() {
    const resortId = parseInt(document.getElementById('detailsBookBtn').getAttribute('data-resort-id'));
    closeResortDetails();
    openBookingModal(resortId);
}

// Logo rotation function
function rotateLogo() {
    const logo = document.querySelector('.brand-logo');
    logo.classList.add('rotating');
    
    setTimeout(() => {
        logo.classList.remove('rotating');
    }, 600);
}

window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    const detailsModal = document.getElementById('resortDetailsModal');
    
    if (event.target === bookingModal) {
        bookingModal.style.display = 'none';
    }
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
}

// Initialize Razorpay
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    }).then(loaded => {
        if (!loaded) {
            console.error('Failed to load Razorpay script');
        }
        return loaded;
    });
}