let resorts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
});

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

function displayResorts() {
    const grid = document.getElementById('resortsGrid');
    
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            <div class="resort-status">
                <div>
                    <h4>${resort.name}</h4>
                    <p>${resort.location} - ₹${resort.price}/night</p>
                    <small>Max: ${resort.max_guests} guests, Extra: ₹${resort.per_head_charge}/head</small>
                </div>
                <span class="status-badge ${resort.available ? 'available' : 'unavailable'}">
                    ${resort.available ? 'Available' : 'Unavailable'}
                </span>
            </div>
            <div class="resort-media">
                ${resort.images && resort.images.length > 0 ? 
                    `<img src="${resort.images[0]}" alt="${resort.name}" style="width:100px;height:60px;object-fit:cover;" onerror="this.style.display='none'">` : 
                    '<div style="width:100px;height:60px;background:#eee;display:flex;align-items:center;justify-content:center;">No Image</div>'
                }
                <small>${resort.images ? resort.images.length : 0} images, ${resort.videos ? resort.videos.length : 0} videos</small>
            </div>
            <div class="resort-actions">
                <button class="availability-btn ${resort.available ? 'available' : 'unavailable'}" 
                        onclick="toggleAvailability(${resort.id}, ${!resort.available})">
                    <i class="fas fa-${resort.available ? 'eye-slash' : 'eye'}"></i> 
                    ${resort.available ? 'Disable' : 'Enable'}
                </button>
                <button class="edit-btn" onclick="openEditModal(${resort.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteResort(${resort.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
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
        const response = await fetch('http://localhost:4000/api/gateway/resort', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            alert('Resort added successfully!');
            e.target.reset();
            loadResorts();
        } else {
            const error = await response.json();
            alert('Error adding resort: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding resort: ' + error.message);
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
        const response = await fetch(`http://localhost:4000/api/gateway/resort/${resortId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resortData)
        });
        
        if (response.ok) {
            alert('Resort updated successfully!');
            closeEditModal();
            loadResorts();
        } else {
            const error = await response.json();
            alert('Error updating resort: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating resort: ' + error.message);
    }
}

async function toggleAvailability(resortId, newAvailability) {
    try {
        const response = await fetch(`/api/resorts/${resortId}/availability`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available: newAvailability })
        });
        
        if (response.ok) {
            alert(`Resort ${newAvailability ? 'enabled' : 'disabled'} successfully!`);
            loadResorts();
        } else {
            alert('Error updating availability');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating availability');
    }
}

async function deleteResort(resortId) {
    if (!confirm('Are you sure you want to delete this resort?')) return;
    
    try {
        const response = await fetch(`http://localhost:4000/api/gateway/resort/${resortId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Resort deleted successfully!');
            loadResorts();
        } else {
            alert('Error deleting resort');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting resort');
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