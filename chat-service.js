const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class ChatService {
    constructor(dbPath = './resort_booking.db') {
        this.dbPath = dbPath;
    }

    async getDb() {
        return await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
    }

    async handleQuery(message) {
        const text = message.toLowerCase();
        
        try {
            // Booking reference queries
            const bookingMatch = text.match(/(ve|pa|ke)\d{12}|\d{6,}/i);
            if (bookingMatch) {
                const ref = bookingMatch[0];
                if (ref.toLowerCase().startsWith('ve')) {
                    return await this.getBooking(ref);
                } else if (ref.toLowerCase().startsWith('pa')) {
                    return await this.getFoodOrder(ref);
                } else if (ref.toLowerCase().startsWith('ke')) {
                    return await this.getTravelBooking(ref);
                }
            }

            // Resort queries
            if (text.includes('resort') || text.includes('hotel')) {
                return await this.getResorts();
            }

            // Food queries
            if (text.includes('food') || text.includes('menu')) {
                return await this.getFoodItems();
            }

            // Travel queries
            if (text.includes('travel') || text.includes('package')) {
                return await this.getTravelPackages();
            }

            // Stats queries
            if (text.includes('stats') || text.includes('statistics')) {
                return await this.getStats();
            }

            return { type: 'unknown', message: 'I can help you with bookings, resorts, food orders, and travel packages. Please provide more details.' };

        } catch (error) {
            return { type: 'error', message: 'Sorry, I encountered an error processing your request.' };
        }
    }

    async getBooking(reference) {
        const db = await this.getDb();
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.booking_reference = ? OR b.id = ?
        `, [reference, reference]);
        
        if (booking) {
            return {
                type: 'booking',
                message: `Booking ${booking.booking_reference || reference}: ${booking.guest_name} at ${booking.resort_name}. Check-in: ${booking.check_in}, Status: ${booking.payment_status}`
            };
        }
        return { type: 'not_found', message: 'Booking not found.' };
    }

    async getFoodOrder(orderId) {
        const db = await this.getDb();
        const order = await db.get('SELECT * FROM food_orders WHERE order_id = ?', [orderId]);
        
        if (order) {
            return {
                type: 'food_order',
                message: `Food order ${order.order_id}: ${order.guest_name}, Total: ₹${order.total}, Status: ${order.status}`
            };
        }
        return { type: 'not_found', message: 'Food order not found.' };
    }

    async getTravelBooking(reference) {
        const db = await this.getDb();
        const booking = await db.get('SELECT * FROM travel_bookings WHERE booking_reference = ? OR id = ?', [reference, reference]);
        
        if (booking) {
            return {
                type: 'travel_booking',
                message: `Travel booking ${booking.booking_reference}: ${booking.customer_name}, Travel date: ${booking.travel_date}, Status: ${booking.status}`
            };
        }
        return { type: 'not_found', message: 'Travel booking not found.' };
    }

    async getResorts() {
        const db = await this.getDb();
        const resorts = await db.all('SELECT name, price FROM resorts WHERE available = 1 ORDER BY price LIMIT 3');
        const list = resorts.map(r => `${r.name} (₹${r.price})`).join(', ');
        return {
            type: 'resorts',
            message: `Available resorts: ${list}`
        };
    }

    async getFoodItems() {
        const db = await this.getDb();
        const items = await db.all('SELECT name, price FROM food_items ORDER BY price LIMIT 5');
        const list = items.map(i => `${i.name} (₹${i.price})`).join(', ');
        return {
            type: 'food_items',
            message: `Popular food items: ${list}`
        };
    }

    async getTravelPackages() {
        const db = await this.getDb();
        const packages = await db.all('SELECT name, price FROM travel_packages ORDER BY price LIMIT 3');
        const list = packages.map(p => `${p.name} (₹${p.price})`).join(', ');
        return {
            type: 'travel_packages',
            message: `Travel packages: ${list}`
        };
    }

    async getStats() {
        const db = await this.getDb();
        const stats = {
            resorts: (await db.get('SELECT COUNT(*) as count FROM resorts WHERE available = 1')).count,
            bookings: (await db.get('SELECT COUNT(*) as count FROM bookings WHERE payment_status = "paid"')).count,
            foodOrders: (await db.get('SELECT COUNT(*) as count FROM food_orders WHERE status = "confirmed"')).count
        };
        return {
            type: 'stats',
            message: `Statistics: ${stats.resorts} resorts, ${stats.bookings} confirmed bookings, ${stats.foodOrders} food orders`
        };
    }
}

module.exports = ChatService;