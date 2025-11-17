import { useEffect } from 'react';
import { handlePaymentWebhook } from '../../services/escrowService';

// Webhook handler component for Cashfree payment notifications
export function CashfreeWebhook() {
  useEffect(() => {
    // Listen for webhook events (in production, this would be a server endpoint)
    const handleWebhookMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'CASHFREE_WEBHOOK') {
        await handlePaymentWebhook(event.data.payload);
      }
    };

    window.addEventListener('message', handleWebhookMessage);
    return () => window.removeEventListener('message', handleWebhookMessage);
  }, []);

  return null; // This component doesn't render anything
}

// Simulate webhook for testing (remove in production)
export const simulatePaymentWebhook = (groupId: string, amount: number) => {
  window.postMessage({
    type: 'CASHFREE_WEBHOOK',
    payload: {
      vAccountId: `group_${groupId}`,
      amount: amount.toString(),
      utr: `UTR${Date.now()}`,
      status: 'SUCCESS'
    }
  }, window.location.origin);
};