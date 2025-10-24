let resorts = [];
let foodItems = [];
let travelPackages = [];
let editingId = null;
let editingFoodId = null;
let editingTravelId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    loadFoodItems();
    loadTravelPackages();
    loadCoupons();
    loadOwners();
    setupEventListeners();
    // Delay EventBridge setup to ensure page is fully loaded
    setTimeout(setupEventBridgeSync, 1000);
    
    // Toggle owner credentials visibility
    document.getElementById('createOwnerAccount').addEventListener('change', function() {
        const ownerCredentials = document.getElementById('ownerCredentials');
        ownerCredentials.style.display = this.checked ? 'block' : 'none';
    });
    
    // Toggle coupon credentials visibility
    document.getElementById('createCoupon').addEventListener('change', function() {
        const couponCredentials = document.getElementById('couponCredentials');
        if (this.checked) {
            populateCouponResortDropdown();
            couponCredentials.style.display = 'block';
        } else {
            couponCredentials.style.display = 'none';
        }
    });
});

function setupEventBridgeSync() {
    console.log('📡 EventBridge real-time sync enabled for admin panel');
    
    let eventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    function connectEventSource() {
        try {
            eventSource = new EventSource('/api/events');
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Admin EventBridge event received:', data);
                    
                    // Resort events
                    if (data.type === 'resort.updated' || data.type === 'resort.added' || data.type === 'resort.deleted') {
                        console.log('🏨 Resort update received - refreshing resorts');
                        loadResorts();
                        loadOwners(); // Refresh owners when resorts change
                    }
                    
                    // Food item events
                    if (data.type === 'food.item.created' || data.type === 'food.item.updated' || data.type === 'food.item.deleted') {
                        console.log('🍽️ Food item update received - refreshing menu');
                        loadFoodItems();
                    }
                    
                    // Travel package events
                    if (data.type === 'travel.package.created' || data.type === 'travel.package.updated' || data.type === 'travel.package.deleted') {
                        console.log('🚗 Travel package update received - refreshing packages');
                        loadTravelPackages();
                    }
                    

                } catch (error) {
                    // Ignore ping messages
                }
            };
            
            eventSource.onerror = function(error) {
                console.log('⚠️ Admin EventBridge connection error, attempting reconnect...');
                eventSource.close();
                
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectEventSource, 2000 * reconnectAttempts);
                } else {
                    console.log('❌ Max reconnection attempts reached');
                }
            };
            
            eventSource.onopen = function() {
                console.log('✅ EventBridge connected to admin panel');
                reconnectAttempts = 0;
            };
        } catch (error) {
            console.error('Admin EventBridge setup failed:', error);
        }
    }
    
    connectEventSource();
    
    // Fallback polling
    setInterval(() => {
        loadResorts();
        loadFoodItems();
        loadTravelPackages();
        loadOwners();
    }, 60000);
}

function setupEventListeners() {
    const form = document.getElementById('resortForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    const foodForm = document.getElementById('foodForm');
    if (foodForm) {
        foodForm.addEventListener('submit', handleFoodSubmit);
    }
    
    const travelForm = document.getElementById('travelForm');
    if (travelForm) {
        travelForm.addEventListener('submit', handleTravelSubmit);
    }
    

}

async function loadResorts() {
    try {
        console.log('Loading resorts from admin server...');
        const response = await fetch('/api/resorts');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        resorts = await response.json();
        console.log('Loaded resorts:', resorts.length);
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
        const grid = document.getElementById('resortsGrid');
        if (grid) {
            grid.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">Failed to load resorts: ${error.message}</div>`;
        }
    }
}

function populateCouponResortDropdown() {
    const select = document.getElementById('couponResort');
    select.innerHTML = '<option value="current">Current Resort</option>';
    
    resorts.forEach(resort => {
        const option = document.createElement('option');
        option.value = resort.id;
        option.textContent = resort.name;
        select.appendChild(option);
    });
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    if (!grid) return;
    
    if (!resorts || resorts.length === 0) {
        grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No resorts found. Add your first resort using the form above.</div>';
        // Also clear sortable resorts
        const sortableContainer = document.getElementById('sortableResorts');
        if (sortableContainer) {
            sortableContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No resorts to order.</div>';
        }
        return;
    }
    
    grid.innerHTML = resorts.map(resort => {
        let pricingInfo = `<p><strong>Base Price:</strong> ₹${resort.price.toLocaleString()}/night</p>`;
        
        if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
            pricingInfo += '<p><strong>Dynamic Pricing:</strong></p>';
            resort.dynamic_pricing.forEach(pricing => {
                const dayType = pricing.day_type.charAt(0).toUpperCase() + pricing.day_type.slice(1);
                pricingInfo += `<p style="margin-left: 15px; font-size: 0.9em;">• ${dayType}: ₹${pricing.price.toLocaleString()}/night</p>`;
            });
        }
        
        return `
            <div class="resort-item">
                <img src="${resort.image}" alt="${resort.name}" class="resort-image">
                <div class="resort-info">
                    <h3>${resort.name}</h3>
                    <p><strong>Location:</strong> ${resort.location}</p>
                    ${pricingInfo}
                    <p><strong>Description:</strong> ${resort.description}</p>
                    ${resort.amenities ? `<p><strong>Amenities:</strong> ${resort.amenities.replace(/\n/g, ', ')}</p>` : ''}
                    ${resort.note ? `<p><strong>Payment Note:</strong> ${resort.note}</p>` : ''}
                </div>
                <div class="resort-actions">
                    <button class="edit" onclick="editResort(${resort.id})">Edit</button>
                    <button class="delete" onclick="deleteResort(${resort.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Also populate the sortable resorts section
    displaySortableResorts(resorts);
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    // Collect dynamic pricing data
    const dynamicPricing = [];
    const weekdayPrice = document.getElementById('weekdayPrice').value;
    const fridayPrice = document.getElementById('fridayPrice').value;
    const weekendPrice = document.getElementById('weekendPrice').value;
    const holidayPrice = document.getElementById('holidayPrice').value;
    
    if (weekdayPrice) dynamicPricing.push({ day_type: 'weekday', price: parseInt(weekdayPrice) });
    if (fridayPrice) dynamicPricing.push({ day_type: 'friday', price: parseInt(fridayPrice) });
    if (weekendPrice) dynamicPricing.push({ day_type: 'weekend', price: parseInt(weekendPrice) });
    if (holidayPrice) dynamicPricing.push({ day_type: 'holiday', price: parseInt(holidayPrice) });

    const resortData = {
        name: document.getElementById('name').value,
        location: document.getElementById('location').value,
        price: parseInt(document.getElementById('price').value),
        description: document.getElementById('description').value,
        amenities: document.getElementById('amenities').value,
        note: document.getElementById('note').value,
        max_guests: parseInt(document.getElementById('maxGuests').value) || null,
        image: document.getElementById('image').value,
        gallery: document.getElementById('gallery').value,
        videos: document.getElementById('videos').value,
        map_link: document.getElementById('mapLink').value,
        dynamic_pricing: dynamicPricing
    };
    
    // Add owner credentials if checkbox is checked
    if (document.getElementById('createOwnerAccount').checked) {
        const ownerName = document.getElementById('ownerName').value;
        const ownerEmail = document.getElementById('ownerEmail').value;
        const ownerPassword = document.getElementById('ownerPassword').value;
        
        if (!ownerName || !ownerEmail || !ownerPassword) {
            alert('Please fill all owner credential fields');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        if (ownerPassword.length < 6) {
            alert('Owner password must be at least 6 characters');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        resortData.createOwner = true;
        resortData.ownerName = ownerName;
        resortData.ownerEmail = ownerEmail;
        resortData.ownerPassword = ownerPassword;
    }

    try {
        let response;
        if (editingId) {
            response = await fetch(`/api/resorts/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resortData)
            });
        } else {
            response = await fetch('/api/resorts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resortData)
            });
        }

        if (response.ok) {
            let successMessage = editingId ? 'Resort updated successfully' : 'Resort added successfully';
            
            // Create coupon if checkbox is checked
            if (document.getElementById('createCoupon').checked) {
                const couponCode = document.getElementById('couponCode').value.trim().toUpperCase();
                const couponType = document.getElementById('couponType').value;
                const couponDiscount = parseInt(document.getElementById('couponDiscount').value);
                const couponDayType = document.getElementById('couponDayType').value;
                const selectedResort = document.getElementById('couponResort').value;
                
                if (couponCode && couponDiscount) {
                    try {
                        const couponData = {
                            code: couponCode,
                            type: couponType,
                            discount: couponDiscount,
                            day_type: couponDayType
                        };
                        
                        const couponResponse = await fetch('/api/coupons', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(couponData)
                        });
                        
                        if (couponResponse.ok) {
                            successMessage += ` and coupon ${couponData.code} created successfully!`;
                        } else {
                            const couponError = await couponResponse.json();
                            successMessage += `, but coupon creation failed: ${couponError.error}`;
                        }
                    } catch (couponError) {
                        successMessage += ', but coupon creation failed due to network error';
                    }
                }
            }
            
            alert(successMessage);
            document.getElementById('resortForm').reset();
            cancelEdit();
            loadResorts();
            loadOwners(); // Refresh owners list
        } else {
            alert('Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function editResort(id) {
    const resort = resorts.find(r => r.id === id);
    if (!resort) return;

    editingId = id;
    document.getElementById('name').value = resort.name;
    document.getElementById('location').value = resort.location;
    document.getElementById('price').value = resort.price;
    document.getElementById('description').value = resort.description;
    document.getElementById('amenities').value = resort.amenities || '';
    document.getElementById('note').value = resort.note || '';
    document.getElementById('maxGuests').value = resort.max_guests || '';
    document.getElementById('image').value = resort.image;
    document.getElementById('gallery').value = resort.gallery || '';
    document.getElementById('videos').value = resort.videos || '';
    document.getElementById('mapLink').value = resort.map_link || '';
    
    // Load dynamic pricing
    document.getElementById('weekdayPrice').value = '';
    document.getElementById('fridayPrice').value = '';
    document.getElementById('weekendPrice').value = '';
    document.getElementById('holidayPrice').value = '';
    
    if (resort.dynamic_pricing) {
        resort.dynamic_pricing.forEach(pricing => {
            if (pricing.day_type === 'weekday') {
                document.getElementById('weekdayPrice').value = pricing.price;
            } else if (pricing.day_type === 'friday') {
                document.getElementById('fridayPrice').value = pricing.price;
            } else if (pricing.day_type === 'weekend') {
                document.getElementById('weekendPrice').value = pricing.price;
            } else if (pricing.day_type === 'holiday') {
                document.getElementById('holidayPrice').value = pricing.price;
            }
        });
    }
    
    document.getElementById('submitBtn').textContent = 'Update Resort';
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelEdit() {
    editingId = null;
    document.getElementById('resortForm').reset();
    document.getElementById('weekdayPrice').value = '';
    document.getElementById('fridayPrice').value = '';
    document.getElementById('weekendPrice').value = '';
    document.getElementById('holidayPrice').value = '';
    document.getElementById('createOwnerAccount').checked = false;
    document.getElementById('ownerCredentials').style.display = 'none';
    document.getElementById('createCoupon').checked = false;
    document.getElementById('couponCredentials').style.display = 'none';
    document.getElementById('submitBtn').textContent = 'Add Resort';
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deleteResort(id) {
    if (!confirm('Are you sure you want to delete this resort?')) return;

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
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

// Coupon Management Functions
let coupons = [];

async function loadCoupons() {
    try {
        const response = await fetch('/api/coupons');
        coupons = await response.json();
        displayCoupons();
        console.log('Loaded coupons:', coupons);
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

function displayCoupons() {
    const grid = document.getElementById('couponsGrid');
    if (!grid) return;
    
    if (!coupons || coupons.length === 0) {
        grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No coupons found.</div>';
        return;
    }
    
    grid.innerHTML = coupons.map(coupon => `
        <div class="coupon-item">
            <h4>${coupon.code}</h4>
            <div class="coupon-details">
                <p><strong>Type:</strong> ${coupon.type}</p>
                <p><strong>Discount:</strong> ${coupon.type === 'percentage' ? coupon.discount + '%' : '₹' + coupon.discount}</p>
                <p><strong>Valid for:</strong> ${coupon.day_type === 'all' ? 'All days' : coupon.day_type}</p>
                <p><strong>Created:</strong> ${new Date(coupon.created_at).toLocaleDateString()}</p>
            </div>
            <div class="coupon-actions">
                <button class="delete" onclick="deleteCoupon('${coupon.code}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteCoupon(code) {
    if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;

    try {
        const response = await fetch(`/api/coupons/${code}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Coupon deleted successfully');
            loadCoupons();
        } else {
            alert('Failed to delete coupon');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

// Food Item Management Functions
async function loadFoodItems() {
    try {
        const response = await fetch('/api/food-items');
        foodItems = await response.json();
        displayFoodItems();
    } catch (error) {
        console.error('Error loading food items:', error);
    }
}

function displayFoodItems() {
    const grid = document.getElementById('foodItemsGrid');
    if (!grid) return;
    
    grid.innerHTML = foodItems.map(item => `
        <div class="food-item-card">
            <h4>${item.name}</h4>
            <div class="price">₹${item.price}</div>
            <div class="category">${item.category}</div>
            ${item.description ? `<div class="description">${item.description}</div>` : ''}
            <div class="food-item-actions">
                <button class="edit" onclick="editFoodItem(${item.id})">Edit</button>
                <button class="delete" onclick="deleteFoodItem(${item.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function handleFoodSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('foodSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const foodData = {
        name: document.getElementById('foodName').value,
        price: parseInt(document.getElementById('foodPrice').value),
        category: document.getElementById('foodCategory').value,
        description: document.getElementById('foodDescription').value,
        image: document.getElementById('foodImage').value
    };

    try {
        let response;
        if (editingFoodId) {
            response = await fetch(`/api/food-items/${editingFoodId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(foodData)
            });
        } else {
            response = await fetch('/api/food-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(foodData)
            });
        }

        if (response.ok) {
            alert(editingFoodId ? 'Food item updated successfully' : 'Food item added successfully');
            document.getElementById('foodForm').reset();
            cancelFoodEdit();
            loadFoodItems();
        } else {
            alert('Operation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function editFoodItem(id) {
    const item = foodItems.find(f => f.id === id);
    if (!item) return;

    editingFoodId = id;
    document.getElementById('foodName').value = item.name;
    document.getElementById('foodPrice').value = item.price;
    document.getElementById('foodCategory').value = item.category;
    document.getElementById('foodDescription').value = item.description || '';
    document.getElementById('foodImage').value = item.image || '';
    
    document.getElementById('foodSubmitBtn').textContent = 'Update Food Item';
    const cancelBtn = document.getElementById('foodCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelFoodEdit() {
    editingFoodId = null;
    document.getElementById('foodForm').reset();
    document.getElementById('foodSubmitBtn').textContent = 'Add Food Item';
    const cancelBtn = document.getElementById('foodCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deleteFoodItem(id) {
    if (!confirm('Are you sure you want to delete this food item?')) return;

    try {
        const response = await fetch(`/api/food-items/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Food item deleted successfully');
            loadFoodItems();
        } else {
            alert('Failed to delete food item');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

// Travel Package Management Functions
async function loadTravelPackages() {
    try {
        const response = await fetch('/api/travel-packages');
        travelPackages = await response.json();
        displayTravelPackages();
    } catch (error) {
        console.error('Error loading travel packages:', error);
    }
}

function displayTravelPackages() {
    const grid = document.getElementById('travelPackagesGrid');
    if (!grid) return;
    
    grid.innerHTML = travelPackages.map(pkg => {
        let carPricingInfo = '';
        if (pkg.car_pricing) {
            carPricingInfo = `
                <div class="car-pricing-info">
                    <strong>Car Pricing:</strong><br>
                    <small>5 Seater: ₹${pkg.car_pricing['5_seater'] || pkg.price}</small><br>
                    <small>7 Seater: ₹${pkg.car_pricing['7_seater'] || pkg.price}</small><br>
                    <small>12 Seater: ₹${pkg.car_pricing['12_seater'] || pkg.price}</small><br>
                    <small>14 Seater: ₹${pkg.car_pricing['14_seater'] || pkg.price}</small>
                </div>
            `;
        }
        
        return `
            <div class="travel-package-card">
                <h4>${pkg.name}</h4>
                <div class="price">Base: ₹${pkg.price}</div>
                <div class="duration">${pkg.duration}</div>
                ${pkg.description ? `<div class="description">${pkg.description}</div>` : ''}
                ${carPricingInfo}
                <div class="travel-package-actions">
                    <button class="edit" onclick="editTravelPackage(${pkg.id})">Edit</button>
                    <button class="delete" onclick="deleteTravelPackage(${pkg.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function handleTravelSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('travelSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const galleryValue = document.getElementById('travelGallery').value;
    console.log('🖼️ Gallery field value:', galleryValue);
    
    const travelData = {
        name: document.getElementById('travelName').value,
        price: parseInt(document.getElementById('travelPrice').value),
        duration: document.getElementById('travelDuration').value,
        description: document.getElementById('travelDescription').value,
        image: document.getElementById('travelImage').value,
        gallery: galleryValue,
        sites: document.getElementById('travelSites').value,
        car_pricing: {
            '5_seater': parseInt(document.getElementById('price5Seater').value) || parseInt(document.getElementById('travelPrice').value),
            '7_seater': parseInt(document.getElementById('price7Seater').value) || parseInt(document.getElementById('travelPrice').value),
            '12_seater': parseInt(document.getElementById('price12Seater').value) || parseInt(document.getElementById('travelPrice').value),
            '14_seater': parseInt(document.getElementById('price14Seater').value) || parseInt(document.getElementById('travelPrice').value)
        }
    };

    console.log('📤 Submitting travel package data:', travelData);
    console.log('📤 Gallery in data:', travelData.gallery);

    try {
        let response;
        if (editingTravelId) {
            response = await fetch(`/api/travel-packages/${editingTravelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(travelData)
            });
        } else {
            response = await fetch('/api/travel-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(travelData)
            });
        }

        if (response.ok) {
            alert(editingTravelId ? 'Travel package updated successfully' : 'Travel package added successfully');
            document.getElementById('travelForm').reset();
            cancelTravelEdit();
            loadTravelPackages();
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Travel package operation failed:', errorData);
            alert(`Operation failed: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function editTravelPackage(id) {
    const pkg = travelPackages.find(p => p.id === id);
    if (!pkg) return;

    editingTravelId = id;
    document.getElementById('travelName').value = pkg.name;
    document.getElementById('travelPrice').value = pkg.price;
    document.getElementById('travelDuration').value = pkg.duration;
    document.getElementById('travelDescription').value = pkg.description || '';
    document.getElementById('travelImage').value = pkg.image || '';
    document.getElementById('travelGallery').value = pkg.gallery || '';
    
    // Load car pricing if available
    if (pkg.car_pricing) {
        document.getElementById('price5Seater').value = pkg.car_pricing['5_seater'] || '';
        document.getElementById('price7Seater').value = pkg.car_pricing['7_seater'] || '';
        document.getElementById('price12Seater').value = pkg.car_pricing['12_seater'] || '';
        document.getElementById('price14Seater').value = pkg.car_pricing['14_seater'] || '';
    }
    document.getElementById('travelSites').value = pkg.sites || '';
    

    
    document.getElementById('travelSubmitBtn').textContent = 'Update Travel Package';
    const cancelBtn = document.getElementById('travelCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelTravelEdit() {
    editingTravelId = null;
    document.getElementById('travelForm').reset();
    document.getElementById('travelGallery').value = '';
    document.getElementById('price5Seater').value = '';
    document.getElementById('price7Seater').value = '';
    document.getElementById('price12Seater').value = '';
    document.getElementById('price14Seater').value = '';
    document.getElementById('travelSubmitBtn').textContent = 'Add Travel Package';
    const cancelBtn = document.getElementById('travelCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deleteTravelPackage(id) {
    if (!confirm('Are you sure you want to delete this travel package?')) return;

    try {
        const response = await fetch(`/api/travel-packages/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Travel package deleted successfully');
            loadTravelPackages();
        } else {
            alert('Failed to delete travel package');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

// Owner Management Functions
let owners = [];

async function loadOwners() {
    try {
        const response = await fetch('/api/owners');
        owners = await response.json();
        displayOwners();
        console.log('Loaded owners:', owners);
    } catch (error) {
        console.error('Error loading owners:', error);
    }
}

function displayOwners() {
    const grid = document.getElementById('ownersGrid');
    if (!grid) return;
    
    if (!owners || owners.length === 0) {
        grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No resort owners found.</div>';
        return;
    }
    
    grid.innerHTML = owners.map(owner => {
        const resortNames = owner.resort_names ? owner.resort_names.split(',').join(', ') : 'No resorts assigned';
        return `
            <div class="owner-item">
                <h4>${owner.name}</h4>
                <div class="owner-details">
                    <p><strong>Email:</strong> ${owner.email}</p>
                    <p><strong>Resorts:</strong> ${resortNames}</p>
                    <p><strong>Created:</strong> ${new Date(owner.created_at).toLocaleDateString()}</p>
                </div>
                <div class="owner-actions">
                    <button class="delete" onclick="deleteOwner(${owner.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteOwner(id) {
    if (!confirm('Are you sure you want to delete this owner account?')) return;

    try {
        const response = await fetch(`/api/owners/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Owner deleted successfully');
            loadOwners();
        } else {
            alert('Failed to delete owner');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

// Resort ordering functionality
function displaySortableResorts(resorts) {
    const container = document.getElementById('sortableResorts');
    container.innerHTML = resorts.map(resort => `
        <div class="sortable-resort-item" data-id="${resort.id}" draggable="true">
            <div class="drag-handle">⋮⋮</div>
            <img src="${resort.image}" alt="${resort.name}" class="resort-thumb">
            <div class="resort-info">
                <h4>${resort.name}</h4>
                <p>${resort.location}</p>
            </div>
            <div class="sort-order">#${resort.sort_order || 0}</div>
        </div>
    `).join('');
    
    // Add drag and drop functionality
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const container = document.getElementById('sortableResorts');
    let draggedElement = null;
    
    container.addEventListener('dragstart', (e) => {
        draggedElement = e.target.closest('.sortable-resort-item');
        e.dataTransfer.effectAllowed = 'move';
        draggedElement.style.opacity = '0.5';
    });
    
    container.addEventListener('dragend', (e) => {
        if (draggedElement) {
            draggedElement.style.opacity = '1';
            draggedElement = null;
            document.getElementById('saveOrderBtn').style.display = 'block';
        }
    });
    
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.sortable-resort-item');
        
        if (dropTarget && draggedElement && dropTarget !== draggedElement) {
            const rect = dropTarget.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                container.insertBefore(draggedElement, dropTarget);
            } else {
                container.insertBefore(draggedElement, dropTarget.nextSibling);
            }
            
            updateSortOrderNumbers();
        }
    });
}

function updateSortOrderNumbers() {
    const items = document.querySelectorAll('.sortable-resort-item');
    items.forEach((item, index) => {
        const orderElement = item.querySelector('.sort-order');
        orderElement.textContent = `#${index}`;
    });
}

async function saveResortOrder() {
    const items = document.querySelectorAll('.sortable-resort-item');
    const resortOrders = Array.from(items).map((item, index) => ({
        id: parseInt(item.dataset.id),
        sort_order: index
    }));
    
    try {
        const response = await fetch('/api/resorts/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resortOrders })
        });
        
        if (response.ok) {
            alert('Resort order saved successfully!');
            document.getElementById('saveOrderBtn').style.display = 'none';
            loadResorts(); // Reload to reflect changes
        } else {
            alert('Failed to save resort order');
        }
    } catch (error) {
        alert('Error saving resort order');
    }
}