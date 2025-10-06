let resorts = [];
let foodItems = [];
let editingId = null;
let editingFoodId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    loadFoodItems();
    setupEventListeners();
    setupEventBridgeSync();
});

function setupEventBridgeSync() {
    console.log('📡 EventBridge + fallback polling enabled');
    
    // Listen for EventBridge events via WebSocket or Server-Sent Events
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('📡 EventBridge event received:', data);
        
        if (data.type === 'resort.updated' || data.type === 'resort.added' || data.type === 'resort.deleted') {
            loadResorts(); // Refresh only when EventBridge triggers
        }
    };
    
    eventSource.onerror = function(error) {
        console.log('⚠️ EventBridge connection error, fallback active');
    };
    
    // Fallback: Polling every 30 seconds as backup
    setInterval(async () => {
        try {
            const response = await fetch('/api/resorts');
            const newResorts = await response.json();
            
            if (JSON.stringify(newResorts) !== JSON.stringify(resorts)) {
                console.log('🔄 Fallback sync detected changes');
                resorts = newResorts;
                displayResorts();
            }
        } catch (error) {
            // Silent fallback
        }
    }, 30000);
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
}

async function loadResorts() {
    try {
        const response = await fetch('/api/resorts');
        resorts = await response.json();
        displayResorts();
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    if (!grid) return;
    
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
                </div>
                <div class="resort-actions">
                    <button class="edit" onclick="editResort(${resort.id})">Edit</button>
                    <button class="delete" onclick="deleteResort(${resort.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
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
    const weekendPrice = document.getElementById('weekendPrice').value;
    const holidayPrice = document.getElementById('holidayPrice').value;
    
    if (weekdayPrice) dynamicPricing.push({ day_type: 'weekday', price: parseInt(weekdayPrice) });
    if (weekendPrice) dynamicPricing.push({ day_type: 'weekend', price: parseInt(weekendPrice) });
    if (holidayPrice) dynamicPricing.push({ day_type: 'holiday', price: parseInt(holidayPrice) });

    const resortData = {
        name: document.getElementById('name').value,
        location: document.getElementById('location').value,
        price: parseInt(document.getElementById('price').value),
        description: document.getElementById('description').value,
        amenities: document.getElementById('amenities').value,
        image: document.getElementById('image').value,
        gallery: document.getElementById('gallery').value,
        videos: document.getElementById('videos').value,
        map_link: document.getElementById('mapLink').value,
        dynamic_pricing: dynamicPricing
    };

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
            alert(editingId ? 'Resort updated successfully' : 'Resort added successfully');
            document.getElementById('resortForm').reset();
            cancelEdit();
            loadResorts();
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
    document.getElementById('image').value = resort.image;
    document.getElementById('gallery').value = resort.gallery || '';
    document.getElementById('videos').value = resort.videos || '';
    document.getElementById('mapLink').value = resort.map_link || '';
    
    // Load dynamic pricing
    document.getElementById('weekdayPrice').value = '';
    document.getElementById('weekendPrice').value = '';
    document.getElementById('holidayPrice').value = '';
    
    if (resort.dynamic_pricing) {
        resort.dynamic_pricing.forEach(pricing => {
            if (pricing.day_type === 'weekday') {
                document.getElementById('weekdayPrice').value = pricing.price;
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
    document.getElementById('weekendPrice').value = '';
    document.getElementById('holidayPrice').value = '';
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