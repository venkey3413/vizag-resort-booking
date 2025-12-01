const fetch = require('node-fetch');

class DatabaseClient {
    constructor(baseUrl = 'http://localhost:3003') {
        this.baseUrl = baseUrl;
    }

    async query(sql, params = []) {
        const response = await fetch(`${this.baseUrl}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, params })
        });
        return await response.json();
    }

    async execute(sql, params = []) {
        const response = await fetch(`${this.baseUrl}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, params })
        });
        return await response.json();
    }

    // Resorts
    async getResorts() {
        const response = await fetch(`${this.baseUrl}/api/resorts`);
        return await response.json();
    }

    async createResort(data) {
        const response = await fetch(`${this.baseUrl}/api/resorts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async updateResort(id, data) {
        const response = await fetch(`${this.baseUrl}/api/resorts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async deleteResort(id) {
        const response = await fetch(`${this.baseUrl}/api/resorts/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    // Bookings
    async getBookings() {
        const response = await fetch(`${this.baseUrl}/api/bookings`);
        return await response.json();
    }

    async createBooking(data) {
        const response = await fetch(`${this.baseUrl}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async updateBooking(id, data) {
        const response = await fetch(`${this.baseUrl}/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async deleteBooking(id) {
        const response = await fetch(`${this.baseUrl}/api/bookings/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    // Food Items
    async getFoodItems() {
        const response = await fetch(`${this.baseUrl}/api/food-items`);
        return await response.json();
    }

    async createFoodItem(data) {
        const response = await fetch(`${this.baseUrl}/api/food-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async updateFoodItem(id, data) {
        const response = await fetch(`${this.baseUrl}/api/food-items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async deleteFoodItem(id) {
        const response = await fetch(`${this.baseUrl}/api/food-items/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    // Travel Packages
    async getTravelPackages() {
        const response = await fetch(`${this.baseUrl}/api/travel-packages`);
        return await response.json();
    }

    async createTravelPackage(data) {
        const response = await fetch(`${this.baseUrl}/api/travel-packages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async updateTravelPackage(id, data) {
        const response = await fetch(`${this.baseUrl}/api/travel-packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async deleteTravelPackage(id) {
        const response = await fetch(`${this.baseUrl}/api/travel-packages/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    // Coupons
    async getCoupons() {
        const response = await fetch(`${this.baseUrl}/api/coupons`);
        return await response.json();
    }

    async createCoupon(data) {
        const response = await fetch(`${this.baseUrl}/api/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async deleteCoupon(code) {
        const response = await fetch(`${this.baseUrl}/api/coupons/${code}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    // Owners
    async getOwners() {
        const response = await fetch(`${this.baseUrl}/api/owners`);
        return await response.json();
    }

    async createOwner(data) {
        const response = await fetch(`${this.baseUrl}/api/owners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async deleteOwner(id) {
        const response = await fetch(`${this.baseUrl}/api/owners/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    }
}

module.exports = DatabaseClient;