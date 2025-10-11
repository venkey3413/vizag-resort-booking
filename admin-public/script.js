let resorts = [];
let foodItems = [];
let foodOrders = [];
let editingId = null;
let editingFoodId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    loadFoodItems();
    loadFoodOrders();
    setupEventListeners();
    // Delay EventBridge setup to ensure page is fully loaded
    setTimeout(setupEventBridgeSync, 1000);
    
    // Toggle owner credentials visibility
    document.getElementById('createOwnerAccount').addEventListener('change', function() {
        const ownerCredentials = document.getElementById('ownerCredentials');
        ownerCredentials.style.display = this.checked ? 'block' : 'none';
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
                    }
                    
                    // Food item events
                    if (data.type === 'food.item.created' || data.type === 'food.item.updated' || data.type === 'food.item.deleted') {
                        console.log('🍽️ Food item update received - refreshing menu');
                        loadFoodItems();
                    }
                    
                    // Food order events
                    if (data.type === 'food.order.created' || data.type === 'food.order.updated') {
                        console.log('🍽️ Food order update received - refreshing orders');
                        loadFoodOrders();
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
        loadFoodOrders();
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
    
    const clearOrdersBtn = document.getElementById('clearOrdersBtn');
    if (clearOrdersBtn) {
        clearOrdersBtn.addEventListener('click', clearAllFoodOrders);
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
    document.getElementById('createOwnerAccount').checked = false;
    document.getElementById('ownerCredentials').style.display = 'none';
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

// Food Orders Management Functions
async function loadFoodOrders() {
    try {
        const response = await fetch('/api/food-orders');
        foodOrders = await response.json();
        displayFoodOrders();
    } catch (error) {
        console.error('Error loading food orders:', error);
    }
}

function displayFoodOrders() {
    const grid = document.getElementById('foodOrdersGrid');
    if (!grid) return;
    
    if (foodOrders.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666;">No food orders found</p>';
        return;
    }
    
    grid.innerHTML = foodOrders.map(order => {
        const items = order.items.map(item => `${item.name} x${item.quantity}`).join(', ');
        const statusClass = order.status === 'confirmed' ? 'confirmed' : 
                           order.status === 'cancelled' ? 'cancelled' : 'pending';
        
        return `
            <div class="food-order-card ${statusClass}">
                <div class="order-header">
                    <h4>Order #${order.orderId}</h4>
                    <span class="status ${statusClass}">${order.status.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div class="order-details">
                    <p><strong>Guest:</strong> ${order.guestName}</p>
                    <p><strong>Resort:</strong> ${order.resortName}</p>
                    <p><strong>Phone:</strong> ${order.phoneNumber}</p>
                    <p><strong>Items:</strong> ${items}</p>
                    <p><strong>Total:</strong> ₹${order.total}</p>
                    <p><strong>Delivery:</strong> ${new Date(order.deliveryTime).toLocaleString()}</p>
                    <p><strong>Ordered:</strong> ${new Date(order.orderTime).toLocaleString()}</p>
                    ${order.paymentMethod ? `<p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</p>` : ''}
                    ${order.transactionId ? `<p><strong>UTR:</strong> ${order.transactionId}</p>` : ''}
                    ${order.paymentId ? `<p><strong>Payment ID:</strong> ${order.paymentId}</p>` : ''}
                </div>
                <div class="order-actions">
                    ${order.status === 'pending_verification' ? 
                        `<button class="confirm" onclick="confirmFoodOrder('${order.orderId}')">Confirm</button>` : ''}
                    ${order.status !== 'confirmed' && order.status !== 'cancelled' ? 
                        `<button class="cancel" onclick="cancelFoodOrder('${order.orderId}')">Cancel</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function confirmFoodOrder(orderId) {
    if (!confirm('Confirm this food order?')) return;
    
    try {
        const response = await fetch(`/api/food-orders/${orderId}/confirm`, {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('Food order confirmed successfully');
            loadFoodOrders();
        } else {
            alert('Failed to confirm order');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

async function cancelFoodOrder(orderId) {
    if (!confirm('Cancel this food order?')) return;
    
    try {
        const response = await fetch(`/api/food-orders/${orderId}/cancel`, {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('Food order cancelled successfully');
            loadFoodOrders();
        } else {
            alert('Failed to cancel order');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
}

async function clearAllFoodOrders() {
    if (!confirm('Are you sure you want to clear ALL food orders? This action cannot be undone.')) return;
    
    const button = document.getElementById('clearOrdersBtn');
    const originalText = button.textContent;
    button.textContent = 'Clearing...';
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
            alert('Failed to clear food orders');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}