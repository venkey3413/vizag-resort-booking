let resorts = [];
let csrfToken = '';

document.addEventListener('DOMContentLoaded', function() {
    getCSRFToken();
    loadResorts();
    setupEventListeners();
});

async function getCSRFToken() {
    // CSRF disabled, set empty token
    csrfToken = '';
}

function setupEventListeners() {
    document.getElementById('addResortForm').addEventListener('submit', handleAddResort);
    document.getElementById('editResortForm').addEventListener('submit', handleEditResort);
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

function sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 12px 20px; border-radius: 4px; color: white;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showConfirmation(message) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
        modal.innerHTML = `<div style="background:white;padding:20px;border-radius:8px;text-align:center"><p>${message}</p><button onclick="this.parentElement.parentElement.remove();resolve(true)" style="margin:5px;padding:8px 16px;background:#f44336;color:white;border:none;border-radius:4px">Yes</button><button onclick="this.parentElement.parentElement.remove();resolve(false)" style="margin:5px;padding:8px 16px;background:#ccc;border:none;border-radius:4px">No</button></div>`;
        document.body.appendChild(modal);
        modal.querySelector('button').onclick = () => { modal.remove(); resolve(true); };
        modal.querySelector('button:last-child').onclick = () => { modal.remove(); resolve(false); };
    });
}

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    
    grid.innerHTML = resorts.map(resort => {
        const safeName = sanitizeHtml(resort.name || '');
        const safeLocation = sanitizeHtml(resort.location || '');
        const safePrice = parseInt(resort.price) || 0;
        const safeMaxGuests = parseInt(resort.max_guests) || 0;
        const safePerHeadCharge = parseInt(resort.per_head_charge) || 0;
        const safeId = parseInt(resort.id) || 0;
        const isAvailable = Boolean(resort.available);
        
        return `
        <div class="resort-card">
            <div class="resort-status">
                <div>
                    <h4>${safeName}</h4>
                    <p>${safeLocation} - ₹${safePrice}/night</p>
                    <small>Max: ${safeMaxGuests} guests, Extra: ₹${safePerHeadCharge}/head</small>
                </div>
                <span class="status-badge ${isAvailable ? 'available' : 'unavailable'}">
                    ${isAvailable ? 'Available' : 'Unavailable'}
                </span>
            </div>
            <div class="resort-media">
                ${resort.images && resort.images.length > 0 ? 
                    `<img src="${sanitizeHtml(resort.images[0])}" alt="${safeName}" style="width:100px;height:60px;object-fit:cover;" onerror="this.style.display='none'">` : 
                    '<div style="width:100px;height:60px;background:#eee;display:flex;align-items:center;justify-content:center;">No Image</div>'
                }
                <small>${resort.images ? resort.images.length : 0} images, ${resort.videos ? resort.videos.length : 0} videos</small>
            </div>
            <div class="resort-actions">
                <button class="availability-btn ${isAvailable ? 'available' : 'unavailable'}" 
                        onclick="toggleAvailability(${safeId}, ${!isAvailable})">
                    <i class="fas fa-${isAvailable ? 'eye-slash' : 'eye'}"></i> 
                    ${isAvailable ? 'Disable' : 'Enable'}
                </button>
                <button class="edit-btn" onclick="openEditModal(${safeId})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteResort(${safeId})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

async function handleAddResort(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Parse URLs from textarea
    const imageUrls = formData.get('imageUrls') ? 
        formData.get('imageUrls').split('\n').map(url => url.trim()).filter(url => url) : [];
    const videoUrls = formData.get('videoUrls') ? 
        formData.get('videoUrls').split('\n').map(url => url.trim()).filter(url => url) : [];
    
    const resortData = {
        name: formData.get('name'),
        location: formData.get('location'),
        price: parseInt(formData.get('price')),
        description: formData.get('description'),
        amenities: formData.get('amenities') ? formData.get('amenities').split(',').map(a => a.trim()) : [],
        maxGuests: parseInt(formData.get('maxGuests')) || 10,
        perHeadCharge: parseInt(formData.get('perHeadCharge')) || 300,
        images: imageUrls,
        videos: videoUrls
    };
    
    try {
        const response = await fetch('/api/gateway/resort', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            console.log('Resort added successfully!');
            showNotification('Resort added successfully!', 'success');
            e.target.reset();
            loadResorts();
        } else {
            const error = await response.json();
            console.error('Error adding resort:', error.error || 'Unknown error');
            showNotification('Error adding resort: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        console.error('Error adding resort:', error.message);
        showNotification('Error adding resort: ' + error.message, 'error');
    }
}

function openEditModal(resortId) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return;
    
    document.getElementById('editResortId').value = resort.id;
    document.getElementById('editName').value = resort.name;
    document.getElementById('editLocation').value = resort.location;
    document.getElementById('editPrice').value = resort.price;
    document.getElementById('editDescription').value = resort.description;
    document.getElementById('editAmenities').value = resort.amenities ? resort.amenities.join(', ') : '';
    document.getElementById('editMaxGuests').value = resort.max_guests || 10;
    document.getElementById('editPerHeadCharge').value = resort.per_head_charge || 300;
    document.getElementById('editImageUrls').value = resort.images ? resort.images.join('\n') : '';
    document.getElementById('editVideoUrls').value = resort.videos ? resort.videos.join('\n') : '';
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditResort(e) {
    e.preventDefault();
    
    const resortId = document.getElementById('editResortId').value;
    
    // Parse URLs from textarea
    const imageUrls = document.getElementById('editImageUrls').value ? 
        document.getElementById('editImageUrls').value.split('\n').map(url => url.trim()).filter(url => url) : [];
    const videoUrls = document.getElementById('editVideoUrls').value ? 
        document.getElementById('editVideoUrls').value.split('\n').map(url => url.trim()).filter(url => url) : [];
    
    const resortData = {
        name: document.getElementById('editName').value,
        location: document.getElementById('editLocation').value,
        price: parseInt(document.getElementById('editPrice').value),
        description: document.getElementById('editDescription').value,
        amenities: document.getElementById('editAmenities').value.split(',').map(a => a.trim()).filter(a => a),
        maxGuests: parseInt(document.getElementById('editMaxGuests').value) || 10,
        perHeadCharge: parseInt(document.getElementById('editPerHeadCharge').value) || 300,
        images: imageUrls,
        videos: videoUrls
    };
    
    try {
        const response = await fetch(`/api/gateway/resort/${resortId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            console.log('Resort updated successfully!');
            showNotification('Resort updated successfully!', 'success');
            closeEditModal();
            loadResorts();
        } else {
            const error = await response.json();
            console.error('Error updating resort:', error.error || 'Unknown error');
            showNotification('Error updating resort: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        console.error('Error updating resort:', error.message);
        showNotification('Error updating resort: ' + error.message, 'error');
    }
}

async function toggleAvailability(resortId, newAvailability) {
    console.log(`Toggling resort ${resortId} to ${newAvailability}`);
    
    try {
        const response = await fetch(`/api/resorts/${resortId}/availability`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available: newAvailability })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            console.log(`Resort ${newAvailability ? 'enabled' : 'disabled'} successfully!`);
            showNotification(`Resort ${newAvailability ? 'enabled' : 'disabled'} successfully!`, 'success');
            
            // Update local data immediately for instant UI update
            const resort = resorts.find(r => r.id === resortId);
            if (resort) {
                console.log('Updating local resort data');
                resort.available = newAvailability;
                displayResorts();
            } else {
                console.log('Resort not found in local data');
            }
            
            // Also reload from server to ensure sync
            setTimeout(() => loadResorts(), 100);
        } else {
            console.error('Error updating availability, status:', response.status);
            showNotification('Error updating availability', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating availability: ' + error.message, 'error');
    }
}

async function deleteResort(resortId) {
    if (!await showConfirmation('Are you sure you want to delete this resort?')) return;
    
    try {
        const response = await fetch(`/api/gateway/resort/${resortId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        
        if (response.ok) {
            console.log('Resort deleted successfully!');
            showNotification('Resort deleted successfully!', 'success');
            loadResorts();
        } else {
            console.error('Error deleting resort');
            showNotification('Error deleting resort', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        console.error('Error deleting resort');
        showNotification('Error deleting resort', 'error');
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
}