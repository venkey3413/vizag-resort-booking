const API_BASE = 'http://localhost:3000/api';

// DOM elements
const resortForm = document.getElementById('resortForm');
const editForm = document.getElementById('editForm');
const resortsList = document.getElementById('resortsList');
const editModal = document.getElementById('editModal');
const closeModal = document.querySelector('.close');

// Load resorts on page load
document.addEventListener('DOMContentLoaded', loadResorts);

// Event listeners
resortForm.addEventListener('submit', addResort);
editForm.addEventListener('submit', updateResort);
closeModal.addEventListener('click', () => editModal.style.display = 'none');

async function loadResorts() {
    try {
        const response = await fetch(`${API_BASE}/resorts`);
        const resorts = await response.json();
        displayResorts(resorts);
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

function displayResorts(resorts) {
    resortsList.innerHTML = resorts.map(resort => `
        <div class="resort-card">
            ${resort.image ? `<img src="/uploads/${resort.image}" alt="${resort.name}" class="resort-image">` : '<div class="resort-image" style="background-color: #ddd; display: flex; align-items: center; justify-content: center;">No Image</div>'}
            <div class="resort-info">
                <div class="resort-name">${resort.name}</div>
                <div class="resort-price">$${resort.price}/night</div>
                <div class="resort-description">${resort.description}</div>
                <div class="resort-actions">
                    <button class="edit-btn" onclick="editResort(${resort.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteResort(${resort.id})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function addResort(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('price', document.getElementById('price').value);
    formData.append('description', document.getElementById('description').value);
    
    const imageFile = document.getElementById('image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`${API_BASE}/resorts`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            resortForm.reset();
            loadResorts();
        }
    } catch (error) {
        console.error('Error adding resort:', error);
    }
}

async function editResort(id) {
    try {
        const response = await fetch(`${API_BASE}/resorts`);
        const resorts = await response.json();
        const resort = resorts.find(r => r.id === id);
        
        if (resort) {
            document.getElementById('editId').value = resort.id;
            document.getElementById('editName').value = resort.name;
            document.getElementById('editPrice').value = resort.price;
            document.getElementById('editDescription').value = resort.description;
            editModal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading resort for edit:', error);
    }
}

async function updateResort(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('editName').value);
    formData.append('price', document.getElementById('editPrice').value);
    formData.append('description', document.getElementById('editDescription').value);
    
    const imageFile = document.getElementById('editImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`${API_BASE}/resorts/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            editModal.style.display = 'none';
            loadResorts();
        }
    } catch (error) {
        console.error('Error updating resort:', error);
    }
}

async function deleteResort(id) {
    if (confirm('Are you sure you want to delete this resort?')) {
        try {
            const response = await fetch(`${API_BASE}/resorts/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadResorts();
            }
        } catch (error) {
            console.error('Error deleting resort:', error);
        }
    }
}