let resorts = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('resortForm').addEventListener('submit', handleSubmit);
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
        <div class="resort-item">
            <img src="${resort.image}" alt="${resort.name}" class="resort-image">
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p><strong>Location:</strong> ${resort.location}</p>
                <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
                <p><strong>Description:</strong> ${resort.description}</p>
            </div>
            <div class="resort-actions">
                <button class="edit" onclick="editResort(${resort.id})">Edit</button>
                <button class="delete" onclick="deleteResort(${resort.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const resortData = {
        name: document.getElementById('name').value,
        location: document.getElementById('location').value,
        price: document.getElementById('price').value,
        description: document.getElementById('description').value,
        image: document.getElementById('image').value || 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500'
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
            showNotification(editingId ? 'Resort updated successfully' : 'Resort added successfully', 'success');
            document.getElementById('resortForm').reset();
            cancelEdit();
            loadResorts();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
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
    document.getElementById('image').value = resort.image;
    
    document.getElementById('submitBtn').textContent = 'Update Resort';
    document.getElementById('cancelBtn').style.display = 'inline-block';
}

function cancelEdit() {
    editingId = null;
    document.getElementById('resortForm').reset();
    document.getElementById('submitBtn').textContent = 'Add Resort';
    document.getElementById('cancelBtn').style.display = 'none';
}

async function deleteResort(id) {
    if (!confirm('Are you sure you want to delete this resort?')) return;

    try {
        const response = await fetch(`/api/resorts/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Resort deleted successfully', 'success');
            loadResorts();
        } else {
            showNotification('Failed to delete resort', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
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
    }, 3000);
}