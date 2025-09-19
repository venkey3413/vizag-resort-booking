let resorts = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadResorts();
    setupEventListeners();
});

function setupEventListeners() {
    const form = document.getElementById('resortForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
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
    
    grid.innerHTML = resorts.map(resort => `
        <div class="resort-item">
            <img src="${resort.image}" alt="${resort.name}" class="resort-image">
            <div class="resort-info">
                <h3>${resort.name}</h3>
                <p><strong>Location:</strong> ${resort.location}</p>
                <p><strong>Price:</strong> ₹${resort.price.toLocaleString()}/night</p>
                <p><strong>Description:</strong> ${resort.description}</p>
                ${resort.amenities ? `<p><strong>Amenities:</strong> ${resort.amenities.replace(/\n/g, ', ')}</p>` : ''}
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
        price: parseInt(document.getElementById('price').value),
        description: document.getElementById('description').value,
        amenities: document.getElementById('amenities').value,
        image: document.getElementById('image').value,
        gallery: document.getElementById('gallery').value,
        videos: document.getElementById('videos').value,
        map_link: document.getElementById('mapLink').value
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
    
    document.getElementById('submitBtn').textContent = 'Update Resort';
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelEdit() {
    editingId = null;
    document.getElementById('resortForm').reset();
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