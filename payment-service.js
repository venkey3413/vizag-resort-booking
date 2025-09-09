const Razorpay = require('razorpay');
const crypto = require('crypto');

class PaymentService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }

    // Create payment order
    async createOrder(amount, currency = 'INR', receipt) {
        try {
            const options = {
                amount: Math.round(amount * 100), // Convert to paise
                currency,
                receipt: receipt || `receipt_${Date.now()}`,
                payment_capture: 1
            };

            const order = await this.razorpay.orders.create(options);
            return {
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            };
        } catch (error) {
            console.error('Payment order creation failed:', error.message);
            return {
                success: false,
                error: 'Failed to create payment order'
            };
        }
    }

    // Verify payment signature
    verifyPayment(orderId, paymentId, signature) {
        try {
            const body = orderId + "|" + paymentId;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Payment verification failed:', error.message);
            return false;
        }
    }

    // Get payment details
    async getPaymentDetails(paymentId) {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return {
                success: true,
                payment: {
                    id: payment.id,
                    amount: payment.amount / 100, // Convert back to rupees
                    status: payment.status,
                    method: payment.method,
                    captured: payment.captured,
                    created_at: payment.created_at
                }
            };
        } catch (error) {
            console.error('Failed to fetch payment details:', error.message);
            return {
                success: false,
                error: 'Failed to fetch payment details'
            };
        }
    }
}

module.exports = PaymentService;