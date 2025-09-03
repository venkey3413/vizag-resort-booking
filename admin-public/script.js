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
                </div>
                <span class="status-badge ${resort.available ? 'available' : 'unavailable'}">
                    ${resort.available ? 'Available' : 'Unavailable'}
                </span>
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
    
    try {
        const response = await fetch('/api/resorts', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('Resort added successfully!');
            e.target.reset();
            loadResorts();
        } else {
            alert('Error adding resort');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding resort');
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
    document.getElementById('editAmenities').value = resort.amenities.join(', ');
    document.getElementById('editMaxGuests').value = resort.max_guests || 10;
    document.getElementById('editPerHeadCharge').value = resort.per_head_charge || 300;
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditResort(e) {
    e.preventDefault();
    
    const resortId = document.getElementById('editResortId').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('editName').value);
    formData.append('location', document.getElementById('editLocation').value);
    formData.append('price', document.getElementById('editPrice').value);
    formData.append('description', document.getElementById('editDescription').value);
    formData.append('amenities', document.getElementById('editAmenities').value);
    formData.append('maxGuests', document.getElementById('editMaxGuests').value);
    formData.append('perHeadCharge', document.getElementById('editPerHeadCharge').value);
    
    const imageFiles = document.getElementById('editImages').files;
    for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
    }
    
    try {
        const response = await fetch(`/api/resorts/${resortId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            alert('Resort updated successfully!');
            closeEditModal();
            loadResorts();
        } else {
            alert('Error updating resort');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating resort');
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
        const response = await fetch(`/api/resorts/${resortId}`, {
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